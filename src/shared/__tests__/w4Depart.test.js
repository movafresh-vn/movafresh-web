import { describe, expect, it } from 'vitest';
import { checkDepart, departOp } from '../../ops/departRules';
import { PHOTO_PURPOSE } from '../api/uploads';
import { preparePhotos } from '../../ops/queuePhotos';
import { read } from './helpers/asyncScan';

const OK = { tempC: '3.5', sealNo: 'SEAL-001', photo: 'data:image/jpeg;base64,AAAA', loadedCount: 12, missingCount: 0, confirmMissing: false };

describe('W4-08: xuất xe cần nhiệt độ + ảnh', () => {
  it('W4-08: đủ nhiệt độ, niêm phong, ảnh và có thùng lên xe thì hợp lệ', () => {
    expect(checkDepart(OK)).toBe('');
    expect(checkDepart({ ...OK, tempC: 0 })).toBe(''); // 0°C là số hợp lệ
    expect(checkDepart({ ...OK, tempC: -18 })).toBe('');
  });

  it('W4-08: thiếu ẢNH thì chặn (không gửi lệnh xuất xe không có bằng chứng chuỗi lạnh)', () => {
    expect(checkDepart({ ...OK, photo: '' })).toMatch(/ảnh/i);
    expect(checkDepart({ ...OK, photo: null })).toMatch(/ảnh/i);
  });

  it('W4-08: thiếu nhiệt độ (rỗng, chữ) hoặc niêm phong thì chặn, nhiệt độ được kiểm trước ảnh', () => {
    expect(checkDepart({ ...OK, tempC: '' })).toMatch(/nhiệt độ/i);
    expect(checkDepart({ ...OK, tempC: 'abc' })).toMatch(/nhiệt độ/i);
    expect(checkDepart({ ...OK, tempC: '', photo: '' })).toMatch(/nhiệt độ/i);
    expect(checkDepart({ ...OK, sealNo: '  ' })).toMatch(/niêm phong/);
  });

  it('W4-08: chưa có thùng nào lên xe, hoặc còn thiếu thùng mà chưa xác nhận, thì chặn', () => {
    expect(checkDepart({ ...OK, loadedCount: 0 })).toMatch(/Chưa có thùng/);
    expect(checkDepart({ ...OK, missingCount: 2 })).toMatch(/Còn 2 thùng/);
    expect(checkDepart({ ...OK, missingCount: 2, confirmMissing: true })).toBe('');
  });

  it('W4-08: thao tác depart mang nhiệt độ số, niêm phong đã cắt, ảnh và danh sách thùng dự kiến', () => {
    const op = departOp({ scope: '2026-11-25|T1', tempC: '3.5', sealNo: ' SEAL-001 ', photo: OK.photo, confirmMissing: 1, expected: ['MV-1', 'MV-2'] });
    expect(op).toEqual({ scope: '2026-11-25|T1', tempC: 3.5, sealNo: 'SEAL-001', photo: OK.photo, confirmMissing: true, expected: ['MV-1', 'MV-2'] });
  });

  it('W4-08: ảnh của lệnh depart được tải lên với mục đích "handover" (cùng mục đích máy chủ kiểm khi ghi sổ bàn giao)', async () => {
    expect(PHOTO_PURPOSE.depart).toBe('handover');
    const seen = [];
    const args = await preparePhotos({ call: 'factory.apply', args: { type: 'depart', ...departOp({ scope: 's', tempC: 3, sealNo: 'x', photo: OK.photo, expected: [] }) } }, async (d, p) => {
      seen.push([d, p]);
      return 'handover/202611/abc.jpg';
    });
    expect(seen).toEqual([[OK.photo, 'handover']]);
    expect(args.photo).toBe('handover/202611/abc.jpg');
    expect(args).toMatchObject({ type: 'depart', tempC: 3, sealNo: 'x' });
  });

  it('W4-08: LoadView dùng checkDepart + PhotoInput bắt buộc và không còn đường gửi depart không ảnh', () => {
    const v = read('ops/views/workshop/LoadView.vue');
    expect(v).toMatch(/PhotoInput v-model="photo"[^>]*testid="d-photo"/);
    expect(v).toMatch(/checkDepart\(/);
    expect(v).toMatch(/apply\('depart', departOp\(/);
    expect(v).not.toMatch(/apply\('depart', \{/);
  });
});
