import { onBeforeUnmount, onMounted } from 'vue';
import { createPoller } from './live';

/**
 * Tải dữ liệu khi vào màn rồi tải lại theo nhịp (mặc định 6 giây). Không chồng yêu cầu, tạm dừng khi tab bị ẩn
 * và tải lại ngay khi tab hiện lại. `fn` có thể async và chỉ nên ĐỌC.
 */
export function useLive(fn, { every = 6000 } = {}) {
  const poller = createPoller(fn, { every, isHidden: () => typeof document !== 'undefined' && document.hidden });
  const onVisible = () => poller.visibilityChanged();
  onMounted(() => {
    poller.start();
    document.addEventListener('visibilitychange', onVisible);
  });
  onBeforeUnmount(() => {
    poller.stop();
    document.removeEventListener('visibilitychange', onVisible);
  });
  return poller;
}
