(() => {
  const STYLE_ID = 'dashboard-layout-spacing-style';

  function installStyles() {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .dashboard-screen .dashboard-shell::after{
        content:'';
        display:block;
        width:100%;
        height:28px;
        min-height:28px;
        pointer-events:none;
      }
      .dashboard-screen .dashboard-shell{
        padding-bottom:108px!important;
      }
      .dashboard-screen .dashboard-bottom-nav{
        bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))!important;
      }
      @media(max-width:480px){
        .dashboard-screen .dashboard-shell{
          padding-bottom:110px!important;
        }
        .dashboard-screen .dashboard-bottom-nav{
          bottom:max(18px,calc(env(safe-area-inset-bottom) + 10px))!important;
        }
      }
    `;
    document.head.appendChild(style);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', installStyles, { once: true });
  } else {
    installStyles();
  }
})();
