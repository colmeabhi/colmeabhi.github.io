/* ============================================
   Page navigation
   ============================================ */

function navigate(page) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(function (p) {
        p.classList.remove('active');
    });

    // Show target page
    var target = document.getElementById('page-' + page);
    if (target) target.classList.add('active');

    // Update path bar — highlight active link
    document.querySelectorAll('.path-link').forEach(function (l) {
        l.classList.remove('active');
    });
    var activeLink = document.querySelector('.path-link[data-page="' + page + '"]');
    if (activeLink) activeLink.classList.add('active');

    // Update URL hash (home = clean URL)
    history.pushState(null, '', page === 'home' ? '#' : '#' + page);

    // Scroll to top of new page
    window.scrollTo(0, 0);
}

// Browser back / forward
window.addEventListener('popstate', function () {
    var hash = location.hash.replace('#', '') || 'home';
    navigate(hash);
});

// On first load — check if URL has a hash
(function () {
    var hash = location.hash.replace('#', '');
    if (hash && document.getElementById('page-' + hash)) {
        navigate(hash);
    }
})();
