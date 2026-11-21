<template>
  <section>
    <div class="ops-noprint">
      <h1>Đơn mua (PO)</h1>
      <p class="ops-muted proc-note">
        Sau chốt sổ hệ thống tự lập PO nháp theo nhà cung cấp: nhu cầu − tồn khả dụng của hàng để lâu (gạo, bún, mì, bao bì) + dự phòng hao hụt {{ Math.round(buffer * 100) }}%.
        Vòng đời: Nháp → Duyệt → Đã gửi → NCC xác nhận → Nhận hàng → Có hóa đơn → Đã đối chiếu → Đến hạn → Đã trả.
      </p>
      <p v-if="error" class="ops-error" role="alert" data-testid="po-error">{{ error }}</p>
      <p v-if="msg" class="ops-ok" role="status" data-testid="po-msg">{{ msg }}</p>

      <div class="po-grid">
        <section class="ops-card po-list" aria-label="Danh sách PO">
          <div class="inline-form">
            <div>
              <label for="f-stage">Trạng thái</label>
              <select id="f-stage" v-model="fStage" class="ops-input ops-input-sm" data-testid="f-stage">
                <option value="">Tất cả</option>
                <option value="todo">Cần xử lý</option>
                <option v-for="(label, k) in labels" :key="k" :value="k">{{ label }}</option>
              </select>
            </div>
            <div>
              <label for="f-sup">Nhà cung cấp</label>
              <select id="f-sup" v-model="fSup" class="ops-input ops-input-sm" data-testid="f-supplier">
                <option value="">Tất cả</option>
                <option v-for="s in supplierOptions" :key="s.id" :value="s.id">{{ s.name }}</option>
              </select>
            </div>
          </div>
          <div class="ops-table-wrap gap-top">
            <table class="ops-table" data-testid="po-table">
              <thead><tr><th>PO · nhà cung cấp · ngày giao · tổng · trạng thái</th></tr></thead>
              <tbody>
                <tr v-for="p in shown" :key="p.id" class="row-click" :class="{ 'row-on': p.id === selId }" :data-po="p.id" tabindex="0" @click="select(p.id)" @keydown.enter="select(p.id)">
                  <td>
                    <span class="po-id">{{ p.id }}</span>
                    <small>{{ p.supplierName }} · giao {{ dmy(p.deliveryDay) }} · {{ fmt(p.totalVnd) }}</small>
                    <span class="ops-pill" :class="stagePill(p.stage)">{{ p.stageLabel }}</span>
                    <span v-if="p.shortPct" class="ops-pill ops-pill-bad">thiếu {{ Math.round(p.shortPct * 100) }}%</span>
                    <span v-if="p.sample" class="ops-pill">mẫu</span>
                  </td>
                </tr>
                <tr v-if="!shown.length"><td class="ops-muted">Chưa có PO nào. PO tự lập khi tới giờ chốt sổ (bảng demo → Tới giờ chốt sổ).</td></tr>
              </tbody>
            </table>
          </div>
        </section>

        <div v-if="d" class="po-detail" :data-po-detail="d.po.id">
          <section class="ops-card" aria-label="Chi tiết PO">
            <div class="head-row">
              <h2 data-testid="po-title">{{ d.po.id }}</h2>
              <span class="ops-pill" :class="stagePill(d.po.stage)" data-testid="po-stage">{{ d.po.stageLabel }}</span>
            </div>
            <dl class="kv">
              <div><dt>Nhà cung cấp</dt><dd>{{ d.po.supplierName }}</dd></div>
              <div><dt>Ngày giao</dt><dd>{{ fmtDay(d.po.deliveryDay) }}</dd></div>
              <div><dt>Kỳ công nợ</dt><dd>{{ d.po.termDays }} ngày</dd></div>
              <div><dt>Tổng giá trị</dt><dd>{{ fmt(d.po.totalVnd) }}</dd></div>
              <div v-if="d.po.dueAt"><dt>Đến hạn trả</dt><dd>{{ fmtDeadline(new Date(d.po.dueAt)) }}</dd></div>
              <div v-if="d.po.payableVnd != null"><dt>Phải trả (sau khiếu nại)</dt><dd>{{ fmt(d.po.payableVnd) }}</dd></div>
            </dl>
            <ol class="stepper" aria-label="Vòng đời PO">
              <li v-for="s in steps" :key="s.key" :class="{ done: s.done, now: s.now }" :data-step="s.key">{{ s.label }}<small v-if="s.at">{{ dm(s.at.slice(0, 10)) }}</small></li>
            </ol>

            <div v-if="certProblems.length" class="alert-bad" role="alert" data-testid="cert-warn">
              Giấy chứng nhận của nhà cung cấp:
              <ul><li v-for="c in certProblems" :key="c.id">{{ c.typeLabel }} {{ c.number }}: {{ CERT_LABEL[c.state] }} ({{ c.expiresAt }}{{ c.state === 'expired' ? '' : `, còn ${c.daysLeft} ngày` }})</li></ul>
            </div>

            <h3>Dòng hàng</h3>
            <div class="ops-table-wrap">
              <table class="ops-table" data-testid="po-lines">
                <thead>
                  <tr>
                    <th>Mặt hàng</th><th class="r">Đặt</th><th v-if="d.po.confirmation" class="r">NCC xác nhận</th><th v-if="hasReceipt" class="r">Đạt / không đạt</th>
                    <th class="r">Đơn giá</th><th class="r">Thành tiền</th><th v-if="canWrite && d.po.status === 'draft'" class="r">Từ tồn kho</th>
                  </tr>
                </thead>
                <tbody>
                  <tr v-for="l in d.lines" :key="l.sku" :class="{ 'row-bad': l.targetQty < l.qty }">
                    <td><strong>{{ l.name }}</strong> <span class="mono ops-muted">{{ l.sku }}</span></td>
                    <td class="r">
                      <input v-if="canWrite && d.po.status === 'draft'" class="ops-input ops-input-sm narrow" type="number" min="0" step="0.1" :value="edits[l.sku] ?? l.qty" :data-qty="l.sku" @input="edits[l.sku] = Number($event.target.value)" @change="saveQty(l)" />
                      <template v-else>{{ qty(l.qty) }} {{ l.unit }}</template>
                    </td>
                    <td v-if="d.po.confirmation" class="r" :class="{ 'diff-over': l.targetQty < l.qty }">{{ qty(l.targetQty) }}</td>
                    <td v-if="hasReceipt" class="r">{{ qty(l.accepted) }} / <span :class="{ 'diff-over': l.rejected > 0 }">{{ qty(l.rejected) }}</span></td>
                    <td class="r">{{ fmt(l.unitPriceVnd) }}</td>
                    <td class="r">{{ fmt(l.qty * l.unitPriceVnd) }}</td>
                    <td v-if="canWrite && d.po.status === 'draft'" class="r">{{ l.stockUsedQty ? qty(l.stockUsedQty) : '—' }}</td>
                  </tr>
                </tbody>
              </table>
            </div>
            <p v-if="d.po.coveredByStock && d.po.coveredByStock.length" class="ops-muted">
              Đã trừ tồn kho khả dụng, không đặt thêm: {{ d.po.coveredByStock.map((c) => `${skuName(c.sku)} ${qty(c.qty)} ${c.unit}`).join('; ') }}.
            </p>

            <!-- Hành động theo trạng thái -->
            <div v-if="canWrite" class="ops-actions ops-noprint">
              <template v-if="d.po.status === 'draft'">
                <button class="ops-btn ops-btn-primary" data-testid="po-approve" @click="act(() => api.ops.procurement.approvePo(ctx, d.po.id), 'Đã duyệt PO.')">Duyệt PO</button>
              </template>
              <template v-else-if="d.po.status === 'approved'">
                <button class="ops-btn ops-btn-primary" data-testid="po-send-link" @click="send('link')">Gửi bằng link</button>
                <button class="ops-btn" data-testid="po-send-print" @click="send('print')">In và gửi</button>
              </template>
              <button v-if="d.po.status !== 'draft'" class="ops-btn" data-testid="po-print" @click="printPo">In PO</button>
            </div>
            <div v-if="d.po.sentVia === 'link' || d.po.status === 'approved'" class="gap-top ops-noprint">
              <p class="ops-muted tight">Link gửi nhà cung cấp (đăng nhập bằng PIN của họ):</p>
              <p class="link-box" data-testid="po-link">{{ link }}</p>
            </div>
            <p v-if="d.po.status === 'sent'" class="ops-muted" data-testid="po-waiting">Đã gửi {{ fmtDeadline(new Date(d.po.sentAt)) }}. Chờ nhà cung cấp xác nhận đủ hoặc thiếu.</p>
            <p v-if="d.po.confirmation" class="ops-muted" data-testid="po-confirmed">
              NCC xác nhận {{ d.po.confirmation.result === 'short' ? `THIẾU ${Math.round(d.po.confirmation.shortPct * 100)}%` : 'đủ' }} lúc {{ fmtDeadline(new Date(d.po.confirmation.at)) }}.
              <template v-if="d.po.confirmation.note">Ghi chú: {{ d.po.confirmation.note }}</template>
            </p>
          </section>

          <!-- Đề xuất món thay khi nhà cung cấp xác nhận thiếu -->
          <section v-if="d.impacts.length" class="ops-card" aria-label="Đơn bị ảnh hưởng">
            <div class="head-row">
              <h2>Đơn bị ảnh hưởng vì nhà cung cấp thiếu hàng</h2>
              <button v-if="canSubstitute && pendingHits.length" class="ops-btn ops-btn-primary ops-btn-small" data-testid="apply-all" @click="applyAll">Áp dụng mọi đề xuất ({{ pendingHits.length }})</button>
            </div>
            <p class="ops-muted">Dùng cơ chế đề xuất món thay của xưởng: món cùng loại, không dùng mặt hàng đang thiếu, đã lọc kiêng cữ của khách, ưu tiên món không đắt hơn. Áp dụng sẽ đổi món trong đơn, bù phần chênh vào Fresh Credit và báo khách.</p>
            <details v-for="im in d.impacts" :key="im.shortageId" class="gap-top impact-group" :open="optionCount(im) > 0" :data-shortage="im.shortageId">
              <summary>
                <strong>{{ skuName(im.key) }}</strong> <span class="mono ops-muted">{{ im.shortageId }}</span>
                · thiếu {{ kg(im.needGrams / 1000) }} kg · {{ im.affected.length }} đơn · <span :class="optionCount(im) ? 'diff-ok' : 'diff-over'">{{ optionCount(im) }} bữa có món thay</span>
              </summary>
              <p class="ops-muted tight">Đã có {{ im.handled.length }} bữa được đổi; ước tính phủ {{ kg(im.coveredGrams / 1000) }} kg.</p>
              <template v-for="a in im.affected" :key="a.orderId">
                <div v-if="a.hits.some((h) => h.options.length)" class="impact-order" :data-order="a.orderId">
                  <strong>{{ a.orderId }}</strong> · {{ zoneName(a.zoneId) }} · {{ slotLabel(a.zoneId, a.slotId) }} · giao {{ dm(a.deliveryDay) }}
                  <div v-for="h in a.hits.filter((x) => x.options.length)" :key="`${h.mealIndex}-${h.kind}`" class="impact-hit">
                    <span>Bữa {{ h.mealIndex + 1 }}: {{ h.dishName }}</span>
                    <select v-model="picks[pickKey(im, a, h)]" class="ops-input ops-input-sm" :aria-label="`Món thay cho ${h.dishName}`" :data-pick="`${a.orderId}-${h.mealIndex}`">
                      <option v-for="o in h.options" :key="o.dishId" :value="o.dishId">{{ o.name }} ({{ o.priceDeltaVnd > 0 ? '+' : '' }}{{ fmt(o.priceDeltaVnd) }}{{ o.compensationVnd ? `, bù ${fmt(o.compensationVnd)}` : '' }})</option>
                    </select>
                    <button v-if="canSubstitute" class="ops-btn ops-btn-small" :data-apply="`${a.orderId}-${h.mealIndex}`" @click="apply(im, a, h)">Áp dụng</button>
                  </div>
                </div>
              </template>
              <p v-if="noOptionCount(im)" class="ops-muted tight">{{ noOptionCount(im) }} bữa khác chưa có món thay phù hợp (các mặt hàng thay thế cũng đang thiếu). Xưởng xử lý ở màn Báo thiếu / hỏng.</p>
              <ul v-if="im.handled.length" class="history">
                <li v-for="(h, i) in im.handled" :key="i">Đã đổi {{ h.orderId }}: {{ h.fromDishName }} → {{ h.toDishName }}{{ h.compensationVnd ? `, bù ${fmt(h.compensationVnd)}` : '' }}</li>
              </ul>
            </details>
          </section>

          <!-- Phiếu nhập -->
          <section v-if="d.receipts.length" class="ops-card" aria-label="Phiếu nhập">
            <h2>Phiếu nhập kho phụ</h2>
            <div v-for="r in d.receipts" :key="r.id" class="gap-top">
              <strong class="mono">{{ r.id }}</strong> · {{ fmtDeadline(new Date(r.receivedAt)) }} · {{ r.receivedBy }}
              <div class="ops-table-wrap">
                <table class="ops-table">
                  <thead><tr><th>Mặt hàng</th><th class="r">Đạt</th><th class="r">Không đạt</th><th class="r">°C</th><th>Lô / hạn dùng</th></tr></thead>
                  <tbody>
                    <tr v-for="l in r.lines" :key="l.sku">
                      <td>{{ l.name }}</td><td class="r">{{ qty(l.acceptedQty) }}</td>
                      <td class="r" :class="{ 'diff-over': l.rejectedQty > 0 }">{{ qty(l.rejectedQty) }}<small v-if="l.reason">{{ d.reasons[l.reason] }}</small></td>
                      <td class="r">{{ l.tempC ?? '—' }}</td>
                      <td><span class="mono">{{ l.lotCode }}</span><small>HSD {{ dmy(l.expiresAt) }}</small></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
            <div v-if="d.claims.length" class="gap-top">
              <h3>Phiếu khiếu nại (trừ vào công nợ)</h3>
              <ul class="history">
                <li v-for="c in d.claims" :key="c.id"><span class="mono">{{ c.id }}</span> · {{ skuName(c.sku) }} {{ qty(c.qty) }} {{ c.unit }} · {{ d.reasons[c.reason] }} · <strong>{{ fmt(c.amountVnd) }}</strong>
                  <span class="ops-pill" :class="c.status === 'deducted' ? 'ops-pill-ok' : 'ops-pill-warn'">{{ CLAIM_LABEL[c.status] }}</span>
                  <template v-if="c.reply"><br /><small>NCC phản hồi: {{ c.reply }}</small></template>
                </li>
              </ul>
            </div>
          </section>

          <!-- Hóa đơn và đối chiếu 3 chiều -->
          <section v-if="d.po.status === 'received' || d.po.status === 'received_partial' || d.invoice" class="ops-card" aria-label="Hóa đơn và đối chiếu">
            <h2>Hóa đơn và đối chiếu 3 chiều</h2>
            <template v-if="!d.invoice">
              <p class="ops-muted">Chưa có hóa đơn. Nhà cung cấp tự gửi trên cổng; hoặc nhập hộ hóa đơn giấy bên dưới.</p>
              <form v-if="canWrite" class="inline-form" novalidate @submit.prevent="submitInvoice">
                <div><label for="i-no">Số hóa đơn</label><input id="i-no" v-model="inv.number" class="ops-input" data-testid="inv-number" /></div>
                <div><label for="i-date">Ngày hóa đơn</label><input id="i-date" v-model="inv.issuedAt" type="date" class="ops-input" data-testid="inv-date" /></div>
                <button class="ops-btn" data-testid="inv-submit" type="submit">Nhập hóa đơn theo hàng đã giao</button>
              </form>
            </template>
            <template v-else>
              <p class="tight">Hóa đơn <strong>{{ d.invoice.number }}</strong> ngày {{ dmy(d.invoice.issuedAt) }} · {{ fmt(d.invoice.totalVnd) }}
                <button v-if="d.invoice.file" class="ops-btn ops-btn-small" data-testid="inv-open" @click="openInvoice">Xem tệp hóa đơn</button>
              </p>
            </template>

            <div v-if="d.match" class="gap-top">
              <div class="ops-table-wrap">
                <table class="ops-table" data-testid="match-table">
                  <thead><tr><th>Mặt hàng</th><th class="r">PO</th><th class="r">Đã giao</th><th class="r">Hóa đơn</th><th class="r">Giá PO</th><th class="r">Giá hóa đơn</th><th>Kết quả</th></tr></thead>
                  <tbody>
                    <tr v-for="l in d.match.lines" :key="l.sku" :class="{ 'row-bad': l.status === 'error', 'row-warn': l.status === 'warn' }" :data-match-line="l.sku">
                      <td>{{ l.name }}</td>
                      <td class="r">{{ qty(l.poQty) }}</td>
                      <td class="r">{{ qty(l.deliveredQty) }}<small v-if="l.rejectedQty">({{ qty(l.rejectedQty) }} không đạt)</small></td>
                      <td class="r" :class="{ 'diff-over': l.issues.some((t) => t.startsWith('qty_')) }">{{ qty(l.invoiceQty) }}</td>
                      <td class="r">{{ l.poPrice != null ? fmt(l.poPrice) : '—' }}</td>
                      <td class="r" :class="{ 'diff-over': l.issues.includes('price_diff') }">{{ l.invoicePrice != null ? fmt(l.invoicePrice) : '—' }}</td>
                      <td><span v-if="l.status === 'ok'" class="ops-pill ops-pill-ok">Khớp</span><span v-else class="ops-pill" :class="l.status === 'error' ? 'ops-pill-bad' : 'ops-pill-warn'">{{ l.issues.map(issueLabel).join('; ') }}</span></td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <ul v-if="d.match.issues.length" class="history" data-testid="match-issues">
                <li v-for="(i, k) in d.match.issues" :key="k" :class="i.severity === 'error' ? 'diff-over' : ''">{{ i.message }} · chênh {{ fmt(Math.abs(i.amountVnd)) }}</li>
              </ul>
              <dl class="kv">
                <div><dt>Giá trị PO</dt><dd>{{ fmt(d.match.totals.poVnd) }}</dd></div>
                <div><dt>Hàng đã giao</dt><dd>{{ fmt(d.match.totals.deliveredVnd) }}</dd></div>
                <div><dt>Hóa đơn</dt><dd>{{ fmt(d.match.totals.invoiceVnd) }}</dd></div>
                <div><dt>Khiếu nại trừ công nợ</dt><dd>{{ fmt(d.match.totals.claimVnd) }}</dd></div>
                <div><dt>Phải trả</dt><dd data-testid="payable">{{ fmt(d.match.totals.payableVnd) }}</dd></div>
              </dl>

              <div v-if="d.po.status === 'invoiced' && canWrite" class="gap-top">
                <p v-if="d.match.ok" class="alert-ok" role="status">Ba chiều khớp nhau (trong dung sai).</p>
                <div v-else class="alert-bad" role="alert">
                  Có chênh lệch. Yêu cầu nhà cung cấp xuất lại hóa đơn, hoặc chấp nhận chênh lệch và ghi lý do (trả theo hàng đã giao, đơn giá PO).
                  <label class="check-row"><input v-model="acceptPrice" type="checkbox" data-testid="accept-price" /> Chấp nhận đơn giá trên hóa đơn thay đơn giá PO</label>
                  <label for="m-note">Lý do chấp nhận chênh lệch</label>
                  <input id="m-note" v-model="matchNote" class="ops-input" data-testid="match-note" />
                </div>
                <div class="ops-actions">
                  <button v-if="d.match.ok" class="ops-btn ops-btn-primary" data-testid="match-ok" @click="doMatch(false)">Đối chiếu xong</button>
                  <button v-else class="ops-btn ops-btn-primary" data-testid="match-accept" @click="doMatch(true)">Chấp nhận chênh lệch và đối chiếu</button>
                  <button v-if="!d.match.ok" class="ops-btn" data-testid="match-try" @click="doMatch(false)">Thử đối chiếu (sẽ bị chặn)</button>
                </div>
              </div>
              <p v-if="d.po.matchNote" class="ops-muted">Ghi chú đối chiếu: {{ d.po.matchNote }}</p>
            </div>

            <div v-if="d.po.status === 'matched' && canPay" class="gap-top ops-noprint">
              <h3>Trả nhà cung cấp {{ fmt(d.po.payableVnd) }}</h3>
              <p class="ops-muted tight">Đến hạn {{ fmtDeadline(new Date(d.po.dueAt)) }}. Chi tiền mặt từ {{ fmt(cashLimit) }} trở lên mất quyền khấu trừ VAT đầu vào nên hệ thống chặn.</p>
              <form class="inline-form" novalidate @submit.prevent="pay">
                <div>
                  <label for="p-m">Hình thức</label>
                  <select id="p-m" v-model="payMethod" class="ops-input" data-testid="pay-method"><option value="bank_transfer">Chuyển khoản</option><option value="cash">Tiền mặt</option></select>
                </div>
                <div><label for="p-ref">Mã giao dịch / UNC</label><input id="p-ref" v-model="payRef" class="ops-input" data-testid="pay-ref" /></div>
                <button class="ops-btn ops-btn-primary" data-testid="pay-submit" type="submit">Đã trả</button>
              </form>
            </div>
            <p v-if="d.po.status === 'paid'" class="alert-ok" role="status" data-testid="paid-note">Đã trả {{ fmt(d.po.paidVnd) }} lúc {{ fmtDeadline(new Date(d.po.paidAt)) }}.</p>
          </section>

          <section class="ops-card" aria-label="Lịch sử">
            <h2>Lịch sử PO</h2>
            <ul class="history">
              <li v-for="(h, i) in historyRows" :key="i"><strong>{{ labels[h.status] || h.status }}</strong> · {{ fmtDeadline(new Date(h.at)) }}<template v-if="h.by"> · {{ h.by }}</template><template v-if="h.note"> · {{ h.note }}</template></li>
            </ul>
          </section>
        </div>
        <section v-else class="ops-card"><p class="ops-muted">Chọn một PO ở danh sách bên trái để xem chi tiết.</p></section>
      </div>
    </div>

    <!-- Bản in PO -->
    <section v-if="showSheet && d" class="ops-card ops-print-block doc-sheet" data-testid="po-sheet">
      <h2 class="doc-title">ĐƠN ĐẶT HÀNG {{ d.po.id }}</h2>
      <p class="doc-sub">MOVA Fresh · Ngày giao {{ fmtDay(d.po.deliveryDay) }} · Kỳ công nợ {{ d.po.termDays }} ngày</p>
      <p><strong>Nhà cung cấp:</strong> {{ d.po.supplierName }}<template v-if="d.supplier"> · MST {{ d.supplier.taxId || d.supplier.cccd }} · {{ d.supplier.address }}</template></p>
      <table class="doc-table">
        <thead><tr><th>Mặt hàng</th><th>Mã</th><th class="r">Số lượng</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead>
        <tbody>
          <tr v-for="l in d.lines" :key="l.sku"><td>{{ l.name }}</td><td>{{ l.sku }}</td><td class="r">{{ qty(l.qty) }} {{ l.unit }}</td><td class="r">{{ fmt(l.unitPriceVnd) }}</td><td class="r">{{ fmt(l.qty * l.unitPriceVnd) }}</td></tr>
          <tr><td colspan="4" class="r"><strong>Tổng</strong></td><td class="r"><strong>{{ fmt(d.po.totalVnd) }}</strong></td></tr>
        </tbody>
      </table>
      <p>Nhà cung cấp xác nhận đủ / thiếu trên cổng nhà cung cấp hoặc ký xác nhận bên dưới. Hàng giao tại kho phụ TP.HCM kèm hóa đơn.</p>
      <div class="sign-row"><div>Mua hàng MOVA<br />(ký, ghi rõ họ tên)</div><div>Nhà cung cấp<br />(ký xác nhận)</div><div>Kế toán</div></div>
    </section>
  </section>
</template>

<script setup>
import { computed, nextTick, reactive, ref, watch } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { api } from '../../../shared/api';
import { BUSINESS } from '../../../shared/config/business';
import { SKUS } from '../../../shared/data/catalog';
import { matchIssueLabel } from '../../../shared/domain/procurement';
import { fmt } from '../../../shared/utils/formatters';
import { fmtDay, fmtDeadline } from '../../../shared/utils/time';
import { ctx, session } from '../../session';
import { useLive } from '../../useLive';
import { dm, kg } from '../../format';
import { CERT_LABEL, CLAIM_LABEL, PO_STATUS_LABEL as labels, dmy, stagePill } from '../../labels';
import { slotLabel, zoneName } from '../../factoryStore';

const route = useRoute();
const router = useRouter();
const list = ref([]);
const d = ref(null);
const selId = ref(route.query.po || null);
const error = ref('');
const msg = ref('');
const fStage = ref('');
const fSup = ref('');
const edits = reactive({});
const picks = reactive({});
const inv = reactive({ number: '', issuedAt: '' });
const matchNote = ref('');
const acceptPrice = ref(false);
const payMethod = ref('bank_transfer');
const payRef = ref('');
const showSheet = ref(false);

const buffer = BUSINESS.purchasing.wasteBufferPct;
const cashLimit = BUSINESS.alerts.cashPaymentVatLimitVnd;
const role = computed(() => session.value.role);
const canWrite = computed(() => ['purchasing', 'admin'].includes(role.value));
const canPay = computed(() => ['purchasing', 'accounting', 'admin'].includes(role.value));
const canSubstitute = computed(() => ['purchasing', 'admin'].includes(role.value));

const qty = (n) => (Math.round((n || 0) * 10) / 10).toLocaleString('vi-VN');
const skuName = (k) => (SKUS[k] ? SKUS[k].name : k);
const issueLabel = matchIssueLabel;

const TODO = ['draft', 'approved', 'confirmed', 'received_partial', 'received', 'invoiced', 'due'];
const PRIORITY = ['draft', 'approved', 'sent', 'confirmed', 'received_partial', 'received', 'invoiced', 'due', 'matched', 'paid'];
const shown = computed(() =>
  list.value
    .filter((p) => (!fSup.value || p.supplierId === fSup.value) && (!fStage.value || (fStage.value === 'todo' ? TODO.includes(p.stage) : p.stage === fStage.value)))
    .sort((a, b) => PRIORITY.indexOf(a.stage) - PRIORITY.indexOf(b.stage) || b.deliveryDay.localeCompare(a.deliveryDay) || a.id.localeCompare(b.id))
);
const supplierOptions = computed(() => {
  const m = new Map();
  for (const p of list.value) m.set(p.supplierId, { id: p.supplierId, name: p.supplierName });
  return [...m.values()];
});

const hasReceipt = computed(() => d.value && d.value.receipts.length > 0);
const link = computed(() => `${window.location.origin}${window.location.pathname}#/nha-cung-cap?po=${d.value.po.id}`);
const certProblems = computed(() => (d.value && d.value.supplier ? d.value.supplier.certs.filter((c) => c.state !== 'valid') : []));
const historyRows = computed(() => (d.value ? [...(d.value.po.history || [])].reverse() : []));

const STEP_ORDER = ['draft', 'approved', 'sent', 'confirmed', 'received', 'invoiced', 'matched', 'due', 'paid'];
const steps = computed(() => {
  if (!d.value) return [];
  const po = d.value.po;
  const cur = STEP_ORDER.indexOf(po.stage === 'received_partial' ? 'received' : po.stage);
  const atOf = (s) => {
    if (s === 'due') return po.dueAt;
    const h = (po.history || []).find((x) => x.status === s || (s === 'received' && x.status === 'received_partial'));
    return h ? h.at : null;
  };
  return STEP_ORDER.map((key, i) => ({
    key,
    label: key === 'received' ? (po.status === 'received_partial' ? 'Nhận một phần' : 'Nhận hàng') : labels[key],
    done: i < cur,
    now: i === cur,
    at: atOf(key)
  }));
});

const pendingHits = computed(() => {
  const out = [];
  if (!d.value) return out;
  for (const im of d.value.impacts) for (const a of im.affected) for (const h of a.hits) if (h.options.length) out.push({ im, a, h });
  return out;
});
const optionCount = (im) => im.affected.reduce((n, a) => n + a.hits.filter((h) => h.options.length).length, 0);
const noOptionCount = (im) => im.affected.reduce((n, a) => n + a.hits.filter((h) => !h.options.length).length, 0);
const pickKey = (im, a, h) => `${im.shortageId}|${a.orderId}|${h.mealIndex}|${h.kind}`;

function load() {
  try {
    list.value = api.ops.procurement.listPos(ctx.value);
    if (!selId.value || !list.value.some((p) => p.id === selId.value)) {
      const first = shown.value[0];
      selId.value = first ? first.id : null;
    }
    d.value = selId.value ? api.ops.procurement.getPo(ctx.value, selId.value) : null;
    if (d.value) {
      for (const im of d.value.impacts) for (const a of im.affected) for (const h of a.hits) { const k = pickKey(im, a, h); if (!picks[k]) picks[k] = h.suggestedDishId; }
      if (!inv.issuedAt) inv.issuedAt = d.value.po.deliveryDay;
    }
  } catch (e) {
    error.value = e.message;
  }
}

useLive(load, { every: 7000 });
watch(() => route.query.po, (v) => { if (v && v !== selId.value) { selId.value = v; load(); } });

function select(id) {
  selId.value = id;
  showSheet.value = false;
  msg.value = '';
  router.replace({ path: '/mua-hang', query: { po: id } });
  load();
}

async function act(fn, okText) {
  msg.value = '';
  error.value = '';
  try {
    await fn();
    msg.value = okText;
  } catch (e) {
    error.value = e.message;
  }
  load();
}

function saveQty(l) {
  const q = edits[l.sku];
  if (q === undefined) return;
  act(() => api.ops.procurement.editLine(ctx.value, { poId: d.value.po.id, sku: l.sku, qty: q }), `Đã sửa số lượng ${l.name}.`);
  delete edits[l.sku];
}

function send(via) {
  act(() => api.ops.procurement.sendPo(ctx.value, { poId: d.value.po.id, via }), via === 'print' ? 'Đã gửi. Nhấn In PO để in bản giấy.' : 'Đã gửi. Copy link bên dưới gửi nhà cung cấp.');
  if (via === 'print') printPo();
}

async function printPo() {
  showSheet.value = true;
  await nextTick();
  window.print();
}

function apply(im, a, h) {
  const toDishId = picks[pickKey(im, a, h)];
  act(() => api.ops.substituteDish(ctx.value, { orderId: a.orderId, mealIndex: h.mealIndex, kind: h.kind, toDishId, shortageId: im.shortageId, reason: `${d.value.po.supplierName} thiếu hàng` }), `Đã đổi món cho đơn ${a.orderId} và báo khách.`);
}

async function applyAll() {
  let n = 0;
  error.value = '';
  for (const { im, a, h } of pendingHits.value) {
    try {
      await api.ops.substituteDish(ctx.value, { orderId: a.orderId, mealIndex: h.mealIndex, kind: h.kind, toDishId: picks[pickKey(im, a, h)], shortageId: im.shortageId, reason: `${d.value.po.supplierName} thiếu hàng` });
      n += 1;
    } catch (e) {
      error.value = e.message;
    }
  }
  msg.value = `Đã đổi món cho ${n} bữa và báo khách.`;
  load();
}

function submitInvoice() {
  act(() => api.ops.procurement.submitInvoice(ctx.value, { poId: d.value.po.id, number: inv.number, issuedAt: inv.issuedAt }), 'Đã nhập hóa đơn.');
  inv.number = '';
}

function doMatch(accept) {
  act(() => api.ops.procurement.matchPo(ctx.value, { poId: d.value.po.id, acceptDiff: accept, acceptInvoicePrice: acceptPrice.value, note: matchNote.value }), 'Đã đối chiếu.');
}

function pay() {
  act(() => api.ops.procurement.payPo(ctx.value, { poId: d.value.po.id, method: payMethod.value, ref: payRef.value }), 'Đã ghi nhận thanh toán.');
}

function openInvoice() {
  try {
    const f = api.ops.procurement.invoiceFile(ctx.value, d.value.invoice.id);
    const w = window.open();
    if (w) w.document.write(f.type === 'application/pdf' ? `<iframe src="${f.dataUrl}" style="border:0;width:100%;height:100vh"></iframe>` : `<img src="${f.dataUrl}" style="max-width:100%">`);
  } catch (e) {
    error.value = e.message;
  }
}
</script>
