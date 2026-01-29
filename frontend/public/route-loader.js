// Basculer entre le shell homepage et le loader selon la route
(function() {
  var p = window.location.pathname;
  var s = window.location.search;
  if (p !== '/' || s.indexOf('view=gallery') !== -1) {
    document.querySelector('.home-shell').style.display = 'none';
    document.querySelector('.page-loader').style.display = 'flex';
  }
})();
