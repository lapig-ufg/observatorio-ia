/* Shared by the portal and its independent lesson. Development never loads GA. */
(() => {
  if (window.location.hostname !== 'lapig-ufg.github.io') return;
  window.dataLayer = window.dataLayer || [];
  window.gtag = window.gtag || function () { window.dataLayer.push(arguments); };
  window.gtag('js', new Date());
  window.gtag('config', 'G-2R8KZB3YJ7', {
    send_page_view: false,
    cookie_flags: 'SameSite=None;Secure',
    page_location: window.location.href,
    page_title: document.title
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=G-2R8KZB3YJ7';
  document.head.appendChild(script);
})();
