import { createApp } from 'vue';
import App from './App.vue';
import router from './router';
import { restoreStaff } from './session';
import '../assets/styles/main.css';
import './ops.css';
import './ops-factory.css';
import './ops-procurement.css';
import './ops-logistics.css';
import './ops-finance.css';

// Hỏi lại máy chủ ai đang đăng nhập TRƯỚC khi dựng router, để lần điều hướng đầu tiên đã biết vai trò thật.
restoreStaff()
  .catch(() => null)
  .finally(() => createApp(App).use(router).mount('#ops-app'));
