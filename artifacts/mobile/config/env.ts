export const ENV = {
  BACKEND_URL: process.env.EXPO_PUBLIC_DOMAIN
    ? `https://${process.env.EXPO_PUBLIC_DOMAIN}/api`
    : 'http://localhost:8080/api',
  WS_URL: process.env.EXPO_PUBLIC_DOMAIN
    ? `wss://${process.env.EXPO_PUBLIC_DOMAIN}/api/ws`
    : 'ws://localhost:8080/api/ws',
  APP_VERSION: '1.0.0',
  APP_NAME: 'UnifyOS',
};
