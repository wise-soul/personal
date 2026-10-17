$(document).ready(function () {
    const isMobile = window.innerWidth <= 991;
    const isDismissed = sessionStorage.getItem('warningDismissed') === 'true';

    if (isMobile && !isDismissed) {
        $('#device-warning').css('display', 'flex').hide().fadeIn(400);
    }

    $('#closeWarning').on('click', function () {
        $('#device-warning').fadeOut(300);
        sessionStorage.setItem('warningDismissed', 'true');
    });

    const ITEMS_PER_PAGE = 9;
    let allProjects = [];
    let allCertificates = [];
    let filteredProjects = [];
    let currentPage = 1;
    let currentFilter = 'all';
    let glightboxInstance = null;

    // Filter categories (Artha removed, Freelance to the left of WINGS)
    const CATEGORIES = {
        Freelance: {
            label: 'Freelance',
            codes: ['Freelance', 'EAJ', 'Pribadi', 'Mitra', 'UBSI']
        },
        WINGS: {
            label: 'WINGS (PT. Prakarsa Alam Segar)',
            codes: ['WINGS']
        },
        SMK: {
            label: 'SMK Islam PB. Soedirman 2',
            codes: ['SMK']
        }
    };

    function resolveImageUrl(path) {
        if (!path) return '';
        if (path.startsWith('http://') || path.startsWith('https://') || path.startsWith('data:')) {
            return path;
        }
        if (path.startsWith('storage/')) {
            return path;
        }
        return 'storage/' + path;
    }

    function loadProjects() {
        return $.ajax({
            url: 'assets/data/projects.json',
            type: 'GET',
            dataType: 'json',
            cache: false
        }).then(function (data) {
            return data;
        }).catch(function () {
            if (window.__STATIC_DATA__ && window.__STATIC_DATA__.projects) {
                return window.__STATIC_DATA__.projects;
            }
            return [];
        });
    }

    function loadCertificates() {
        return $.ajax({
            url: 'assets/data/certificates.json',
            type: 'GET',
            dataType: 'json',
            cache: false
        }).then(function (data) {
            return data;
        }).catch(function () {
            if (window.__STATIC_DATA__ && window.__STATIC_DATA__.certificates) {
                return window.__STATIC_DATA__.certificates;
            }
            return [];
        });
    }

    function updateCategoryCounts() {
        $('#allCount').text(allProjects.length);
        $('#count-MainProjects').text(allProjects.length);
        $('#count-Certificate').text(allCertificates.length);

        Object.keys(CATEGORIES).forEach(function (key) {
            const codes = CATEGORIES[key].codes;
            const count = allProjects.filter(p => codes.includes(p.companyCode)).length;
            $('#count-' + key).text(count);
        });
    }

    function renderCertificates() {
        const grid = $('#certificateGrid');
        if (!allCertificates || allCertificates.length === 0) {
            grid.html('<p class="text-muted">Belum ada sertifikat.</p>');
            return;
        }

        let html = '';
        allCertificates.forEach(cert => {
            const imgSrc = resolveImageUrl(cert.image);
            html += `
            <div class="certificate-card animate-fade-up">
                <div class="certificate-img-wrapper">
                    <img src="${imgSrc}" alt="${cert.title}" class="certificate-img" loading="lazy">
                    <div class="certificate-overlay">
                        <a href="${imgSrc}" class="certificate-overlay-btn glightbox-cert" data-gallery="certificates" data-title="${cert.title}">
                            <i class="bi bi-arrows-angle-expand me-1"></i> Preview
                        </a>
                    </div>
                </div>
                <div class="certificate-content">
                    <h4 class="certificate-title">${cert.title}</h4>
                    <p class="certificate-issuer">${cert.issuer}</p>
                    <div class="certificate-footer">
                        <span class="certificate-badge">${cert.category}</span>
                        <span class="certificate-date"><i class="bi bi-calendar3 me-1"></i>${cert.date || ''}</span>
                    </div>
                </div>
            </div>`;
        });

        grid.html(html);

        if (typeof GLightbox !== 'undefined') {
            GLightbox({
                selector: '.glightbox-cert',
                touchNavigation: true,
                loop: true,
                zoomable: true
            });
        }
    }

    // Load all data
    Promise.all([loadProjects(), loadCertificates()]).then(function (results) {
        allProjects = results[0] || [];
        allCertificates = results[1] || [];

        // Extra sanity filter to guarantee no Artha item persists
        allProjects = allProjects.filter(p => p.companyCode !== 'Artha' && !((p.company || '').toLowerCase().includes('artha')));

        updateCategoryCounts();
        applyFilter('all');
        renderCertificates();
        renderTechStackUsage();
    });

    function applyFilter(filter) {
        currentFilter = filter;
        currentPage = 1;

        if (filter === 'all') {
            filteredProjects = [...allProjects];
        } else if (CATEGORIES[filter]) {
            const codes = CATEGORIES[filter].codes;
            filteredProjects = allProjects.filter(p => codes.includes(p.companyCode));
        } else {
            filteredProjects = [];
        }

        renderProjects();
        updateLoadMoreButton();

        $('.category-card').removeClass('active');
        $('.tech-pill-count').removeClass('active');
        if (filter && filter !== 'all') {
            $(`.category-card[data-filter="${filter}"]`).addClass('active');
        }
    }

    function renderProjects() {
        const grid = $('#showcaseGrid');

        if (!currentFilter) {
            grid.html('');
            $('#emptyState').removeClass('d-none')
                .find('p').text('Pilih salah satu kategori di atas untuk melihat proyek.');
            $('#loadMoreBtn').hide();
            return;
        }

        const startIndex = 0;
        const endIndex = currentPage * ITEMS_PER_PAGE;
        const visibleProjects = filteredProjects.slice(startIndex, endIndex);

        if (visibleProjects.length === 0) {
            grid.html('');
            $('#emptyState').removeClass('d-none')
                .find('p').text('Belum ada proyek pada kategori ini.');
            $('#loadMoreBtn').hide();
            return;
        }

        $('#emptyState').addClass('d-none');

        let html = '';
        visibleProjects.forEach((p, idx) => {
            const techBadges = (p.tech || []).map(t => {
                const techClass = getTechClass(t);
                return `<span class="tech-badge ${techClass}">${t}</span>`;
            }).join('');

            const typeClass = p.type === 'Web' ? 'type-web' : 'type-desktop';

            const hasImages = p.images && p.images.length > 0;
            const firstImg = hasImages ? resolveImageUrl(p.images[0]) : '';
            const imageSection = hasImages ? `
            <div class="card-image-wrapper">
                <img src="${firstImg}" alt="${p.name}" class="card-image" loading="lazy">
            </div>` : '';

            html += `
            <div class="project-card animate-fade-up" style="animation-delay:${(idx % 9) * 0.05}s" data-id="${p.id}" onclick="event.preventDefault(); openProjectModal(${p.id})">
                ${imageSection}
                <div class="card-content">
                    <h3 class="card-title">${p.name}</h3>
                    <div class="card-company">${p.company}</div>
                    <p class="card-impact">${p.impact}</p>
                    <div class="card-tech">${techBadges}</div>
                    <div class="card-footer">
                        <span class="card-type ${typeClass}">${p.type}</span>
                    </div>
                </div>
            </div>`;
        });

        grid.html(html);
    }

    $('#loadMoreBtn').on('click', function () {
        const btn = $(this);
        if (btn.hasClass('loading')) return;

        btn.addClass('loading');

        setTimeout(() => {
            currentPage++;
            renderProjects();
            updateLoadMoreButton();
            btn.removeClass('loading');

            const newItems = $('.project-card').slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);
            if (newItems.length) {
                $('html, body').animate({
                    scrollTop: newItems.first().offset().top - 100
                }, 300);
            }
        }, 200);
    });

    function updateLoadMoreButton() {
        const btn = $('#loadMoreBtn');
        const totalVisible = currentPage * ITEMS_PER_PAGE;
        const hasMore = totalVisible < filteredProjects.length;

        if (hasMore && filteredProjects.length > 0) {
            btn.prop('disabled', false).show();
            const remaining = filteredProjects.length - totalVisible;
            btn.find('.btn-text').text(`LOAD MORE (${Math.min(9, remaining)})`);
        } else {
            btn.prop('disabled', true).hide();
        }
    }

    function getTechClass(tech) {
        const map = {
            'Bootstrap': 'badge-bootstrap',
            'jQuery': 'badge-jquery',
            'Laravel': 'badge-laravel',
            'VueJS': 'badge-vuejs',
            'Angular': 'badge-angular',
            'MySQL': 'badge-mysql',
            'ExpressJS': 'badge-expressjs',
            'Electron': 'badge-electron',
            'CodeIgniter': 'badge-codeigniter',
            'CodeIgniter 3': 'badge-codeigniter',
            'Livewire': 'badge-livewire',
            'Flask': 'badge-python',
            'ReactJS': 'badge-reactjs',
            'Firebase': 'badge-firebase',
            'MSSQL': 'badge-mssql',
            'Sequelize': 'badge-nodejs',
            'GridJS': 'badge-javascript',
            'EJS': 'badge-javascript',
            'LocalStorage': 'badge-javascript',
            'Spreadsheet': 'badge-restapi',
            'Spreadsheet API': 'badge-restapi',
            'NET': 'badge-net',
            '.NET': 'badge-net',
            'SQL Server': 'badge-sqlserver'
        };
        return map[tech] || 'badge-default';
    }

    function renderTechStackUsage() {
        const counts = {};
        allProjects.forEach(p => {
            if (p.tech && Array.isArray(p.tech)) {
                p.tech.forEach(t => {
                    let norm = t;
                    if (norm === 'NET') norm = '.NET';
                    if (norm === 'MSSQL') norm = 'SQL Server';
                    counts[norm] = (counts[norm] || 0) + 1;
                });
            }
        });

        const sortedTech = Object.keys(counts).sort((a, b) => counts[b] - counts[a]);

        let html = '';
        sortedTech.forEach(tech => {
            html += `
            <div class="tech-pill-count" data-tech="${tech}">
                <span>${tech}</span>
                <span class="tech-pill-num">${counts[tech]}</span>
            </div>`;
        });

        $('#techStackBadges').html(html);

        $('.tech-pill-count').on('click', function () {
            const tech = $(this).data('tech');
            if ($(this).hasClass('active')) {
                $(this).removeClass('active');
                applyFilter('all');
            } else {
                $('.tech-pill-count').removeClass('active');
                $('.category-card').removeClass('active');
                $(this).addClass('active');
                filterByTechStack(tech);
            }
            scrollToGrid();
        });
    }

    function filterByTechStack(tech) {
        currentFilter = 'tech:' + tech;
        currentPage = 1;

        filteredProjects = allProjects.filter(p => {
            if (!p.tech || !Array.isArray(p.tech)) return false;
            return p.tech.some(t => {
                let norm = t;
                if (norm === 'NET') norm = '.NET';
                if (norm === 'MSSQL') norm = 'SQL Server';
                return norm.toLowerCase() === tech.toLowerCase();
            });
        });

        renderProjects();
        updateLoadMoreButton();
    }

    $('.main-category-card').on('click', function () {
        const mainCat = $(this).data('main');
        $('.main-category-card').removeClass('active');
        $(this).addClass('active');

        if (mainCat === 'projects') {
            $('#techStackSection').show();
            $('#projectsSubSection').show();
            $('#showcaseGrid').show();
            $('#emptyState').addClass('d-none');
            $('#certificateGridSection').addClass('d-none');
            if (!currentFilter) {
                applyFilter('all');
            } else {
                renderProjects();
                updateLoadMoreButton();
            }
        } else if (mainCat === 'certificate') {
            $('#techStackSection').hide();
            $('#projectsSubSection').hide();
            $('#showcaseGrid').hide();
            $('#loadMoreBtn').hide();
            $('#emptyState').addClass('d-none');
            $('#certificateGridSection').removeClass('d-none');
        }
    });

    $('.category-card').on('click', function () {
        const filter = $(this).data('filter');
        applyFilter(filter);
        scrollToGrid();
    });

    $('#showAllBtn').on('click', function () {
        applyFilter('all');
        scrollToGrid();
    });

    function scrollToGrid() {
        if (currentFilter && $('#showcaseGrid').length) {
            $('html, body').animate({
                scrollTop: $('#showcaseGrid').offset().top - 100
            }, 300);
        }
    }

    // Smooth scroll for landing page hash links
    $(document).on('click', 'a[href^="#"]', function (e) {
        const href = $(this).attr('href');
        if (href && href !== '#' && href.length > 1) {
            const target = $(href);
            if (target.length) {
                e.preventDefault();
                const offcanvasEl = document.getElementById('sidebarMobile');
                if (offcanvasEl) {
                    const bsOffcanvas = bootstrap.Offcanvas.getInstance(offcanvasEl);
                    if (bsOffcanvas) bsOffcanvas.hide();
                }
                const offset = 70;
                $('html, body').animate({
                    scrollTop: target.offset().top - offset
                }, 400);
            }
        }
    });

    // Update active nav link on scroll
    $(window).on('scroll', function () {
        const scrollPos = $(window).scrollTop() + 120;
        const sections = ['#home', '#portfolio', '#contact'];
        sections.forEach(function (secId) {
            const $sec = $(secId);
            if ($sec.length) {
                const top = $sec.offset().top;
                const bottom = top + $sec.outerHeight();
                if (scrollPos >= top && scrollPos < bottom) {
                    $('.nav-link-brutal').removeClass('active');
                    $(`.nav-link-brutal[href="${secId}"]`).addClass('active');
                    $('.sidebar-item').removeClass('active');
                    $(`.sidebar-item[href="${secId}"]`).addClass('active');
                }
            }
        });
    });

    function generateProjectCarousel(images, projectId) {
        const container = $('#modalCarouselContainer');

        if (!images || images.length === 0) {
            container.html(`
                <div class="no-image">
                    <div>
                        <i class="bi bi-image"></i>
                        <div>No screenshots available</div>
                        <small class="d-block mt-2" style="opacity:0.7">Project ID: #${projectId}</small>
                    </div>
                </div>
            `);
            return;
        }

        let carouselHtml = `
            <div id="projectCarousel" class="project-carousel carousel slide" data-bs-interval="false" data-bs-wrap="true" data-bs-touch="false">
                <div class="carousel-inner">
        `;

        images.forEach((img, index) => {
            const resolved = resolveImageUrl(img);
            carouselHtml += `
                <div class="carousel-item${index === 0 ? ' active' : ''}">
                    <a href="${resolved}" class="lightbox-item project-banner-link" data-gallery="project-${projectId}" data-title="Screenshot ${index + 1}">
                        <img src="${resolved}" alt="Screenshot ${index + 1}" class="project-banner-img" draggable="false">
                    </a>
                </div>
            `;
        });

        carouselHtml += '</div>';

        if (images.length > 1) {
            carouselHtml += `
                <button class="carousel-control-prev project-carousel-control" type="button" data-bs-target="#projectCarousel" data-bs-slide="prev">
                    <i class="bi bi-chevron-left"></i>
                </button>
                <button class="carousel-control-next project-carousel-control" type="button" data-bs-target="#projectCarousel" data-bs-slide="next">
                    <i class="bi bi-chevron-right"></i>
                </button>
                <span class="project-carousel-counter" id="projectCarouselCounter">1 / ${images.length}</span>
            `;
        }

        carouselHtml += '</div>';

        container.html(carouselHtml);
    }

    function initProjectCarousel() {
        const $carousel = $('#projectCarousel');
        if (!$carousel.length) return;

        const carousel = new bootstrap.Carousel($carousel[0], { interval: false });
        const total = $carousel.find('.carousel-item').length;
        const $counter = $('#projectCarouselCounter');

        const updateCounter = (index) => {
            if ($counter.length) $counter.text((index + 1) + ' / ' + total);
        };
        $carousel.on('slide.bs.carousel', (e) => updateCounter(e.to));
        updateCounter(0);

        const $inner = $carousel.find('.carousel-inner');
        let startX = null;
        let startY = null;
        let didDrag = false;

        $inner.on('pointerdown', function (e) {
            if (e.pointerType === 'mouse' && e.button !== 0) return;
            startX = e.clientX;
            startY = e.clientY;
        });

        $inner.on('pointermove', function (e) {
            if (startX === null) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            if (Math.abs(dx) > 8 || Math.abs(dy) > 8) {
                this.style.cursor = Math.abs(dx) > Math.abs(dy) ? 'grabbing' : '';
            }
        });

        $inner.on('pointerup', function (e) {
            if (startX === null) return;
            const dx = e.clientX - startX;
            const dy = e.clientY - startY;
            startX = null;
            startY = null;
            this.style.cursor = '';
            if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
                didDrag = true;
                if (dx < 0) carousel.next();
                else carousel.prev();
            }
        });

        $inner.on('pointercancel', function () {
            startX = null;
            startY = null;
            this.style.cursor = '';
        });

        $inner.on('click', function (e) {
            if (didDrag) {
                didDrag = false;
                e.preventDefault();
                e.stopPropagation();
            }
        });
    }

    window.openProjectModal = function (projectId) {
        const project = allProjects.find(p => p.id === projectId);
        if (!project) return;

        $('#modalTitle').text(project.name);
        $('#modalCompany').text(project.company);
        $('#modalType').text(project.type).removeClass('type-web type-desktop')
            .addClass(project.type === 'Web' ? 'type-web' : 'type-desktop');
        $('#modalCategory').text(project.category).removeClass()
            .addClass(`category-badge category-${(project.category || 'production').toLowerCase()}`);
        $('#modalImpact').text(project.impact);

        const techHtml = (project.tech || []).map(t => {
            const cls = getTechClass(t);
            return `<span class="tech-badge ${cls}">${t}</span>`;
        }).join('');
        $('#modalTech').html(techHtml);

        generateProjectCarousel(project.images, projectId);

        const modal = new bootstrap.Modal(document.getElementById('projectModal'));
        modal.show();

        $('#projectModal').one('shown.bs.modal', function () {
            setTimeout(() => {
                if (project.images && project.images.length > 0) {
                    initProjectCarousel();
                    if (typeof GLightbox !== 'undefined') {
                        glightboxInstance = GLightbox({
                            selector: '.lightbox-item',
                            touchNavigation: true,
                            loop: true,
                            zoomable: true,
                            closeButton: true,
                            openEffect: 'fade',
                            closeEffect: 'fade'
                        });
                    }
                }
            }, 0);
        });
    };

    $('#projectModal').on('hidden.bs.modal', function () {
        if (glightboxInstance) {
            glightboxInstance.destroy();
            glightboxInstance = null;
        }
        $('#modalCarouselContainer').empty();
    });
});
