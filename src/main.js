import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import router from './router';
import { useMovaStore } from './stores/useMovaStore';
import { supabase } from './services/supabase';
import { api } from './shared/api';
import './assets/styles/tokens.css';
import './assets/styles/main.css';
import './assets/styles/plans.css';

const app = createApp(App);
const pinia = createPinia();

app.use(pinia);
app.use(router);

if (supabase) {
  const store = useMovaStore(pinia);
  supabase.auth.onAuthStateChange((_event, session) => {
    store.setAuthUser(session?.user ?? null);
    if (session?.user) void store.refresh();
  });
  void supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      store.toast('Không thể tải trạng thái đăng nhập MOVA.');
      return;
    }
    store.setAuthUser(data.session?.user ?? null);
  }).catch(() => store.toast('Không thể tải trạng thái đăng nhập MOVA.'));
}

// Danh mục món và giá từ máy chủ (trang vẫn chạy với danh mục có sẵn nếu chưa tải được)
void api.customer.loadDishes().catch(() => null);

app.mount('#app');
