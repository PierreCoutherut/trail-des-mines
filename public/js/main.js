/**
 * TRAIL DES MINES 2026 - MOTEUR D'ANIMATION & LOGIQUE FRONT-END
 * Intégration Lenis + GSAP ScrollTrigger + Navigation Intelligente
 */

document.addEventListener('DOMContentLoaded', () => {

    // ==========================================
    // 1. Initialisation de Lenis (Smooth Scroll)
    // ==========================================
    let lenis;
    if (typeof Lenis !== 'undefined') {
        lenis = new Lenis({
            duration: 1.2,
            easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
            smooth: true,
            touchMultiplier: 1.5,
        });

        // Synchronisation officielle avec le Ticker GSAP pour une fluidité absolue
        if (typeof gsap !== 'undefined') {
            gsap.ticker.add((time) => {
                lenis.raf(time * 1000);
            });
            gsap.ticker.lagSmoothing(0);
        } else {
            function raf(time) {
                lenis.raf(time);
                requestAnimationFrame(raf);
            }
            requestAnimationFrame(raf);
        }
    }

    // ==========================================
    // 2. Synchronisation GSAP & ScrollTrigger
    // ==========================================
    if (typeof gsap !== 'undefined') {
        if (typeof ScrollTrigger !== 'undefined') {
            gsap.registerPlugin(ScrollTrigger);
            if (lenis) {
                lenis.on('scroll', ScrollTrigger.update);
            }
        }

        // Animation d'introduction Hero
        if (document.querySelector('.hero-anim')) {
            gsap.from(".hero-anim", {
                y: 35,
                opacity: 0,
                duration: 1.2,
                stagger: 0.15,
                ease: "power4.out",
                delay: 0.2
            });
        }

        // Parallaxe d'arrière-plan Hero sur Desktop
        let mm = gsap.matchMedia();
        mm.add("(min-width: 768px)", () => {
            if (document.querySelector('.img-parallax') && document.querySelector('.img-container')) {
                gsap.to(".img-parallax", {
                    y: "18%",
                    ease: "none",
                    scrollTrigger: {
                        trigger: ".img-container",
                        start: "top top",
                        end: "bottom top",
                        scrub: true
                    }
                });
            }
        });

        // Marquee piloté au scroll
        if (document.querySelector('.marquee-text-gsap') && document.querySelector('.marquee-section')) {
            gsap.to(".marquee-text-gsap", {
                xPercent: -20,
                ease: "none",
                scrollTrigger: {
                    trigger: ".marquee-section",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1
                }
            });
        }

        // Galerie animée horizontalement au scroll
        const galerieTrack = document.querySelector('.galerie-scroll-track');
        if (galerieTrack && document.querySelector('.galerie-section')) {
            gsap.to(galerieTrack, {
                x: () => -(galerieTrack.scrollWidth - window.innerWidth + 60),
                ease: "none",
                scrollTrigger: {
                    trigger: ".galerie-section",
                    start: "top bottom",
                    end: "bottom top",
                    scrub: 1
                }
            });
        }

        // Fade-up générique au scroll
        gsap.utils.toArray('.gsap-fade-up').forEach(elem => {
            gsap.from(elem, {
                scrollTrigger: {
                    trigger: elem,
                    start: "top 88%"
                },
                y: 30,
                opacity: 0,
                duration: 0.9,
                ease: "power3.out"
            });
        });

        // Apparition en cascade des cartes épreuves
        if (document.querySelector('.course-card')) {
            gsap.from(".course-card", {
                scrollTrigger: {
                    trigger: ".course-card",
                    start: "top 85%"
                },
                y: 40,
                opacity: 0,
                duration: 1,
                stagger: 0.12,
                ease: "power3.out"
            });
        }

        // Apparition en cascade des tuiles Bento (sécurisée fromTo avec nettoyage des propriétés)
        if (document.querySelector('.bento-item')) {
            gsap.fromTo(".bento-item", 
                { opacity: 0, y: 25, scale: 0.98 },
                {
                    opacity: 1,
                    y: 0,
                    scale: 1,
                    duration: 0.8,
                    stagger: 0.12,
                    ease: "power3.out",
                    scrollTrigger: {
                        trigger: ".bento-container",
                        start: "top 95%",
                        once: true
                    },
                    clearProps: "all"
                }
            );
        }
    }

    // ==========================================
    // 3. Menu Mobile & Accordéons (100dvh)
    // ==========================================
    const hamburgerBtn = document.getElementById('hamburger-btn');
    const mobileMenu = document.getElementById('mobile-menu');
    const line1 = document.getElementById('line-1');
    const line2 = document.getElementById('line-2');
    const line3 = document.getElementById('line-3');
    let isMenuOpen = false;

    let tlMenu;
    if (mobileMenu && typeof gsap !== 'undefined') {
        tlMenu = gsap.timeline({ paused: true });
        tlMenu.to(mobileMenu, { opacity: 1, duration: 0.35, ease: "power2.inOut" })
              .to(mobileMenu, { pointerEvents: "auto", duration: 0 }, "<")
              .from(".mobile-link", { y: 20, opacity: 0, duration: 0.35, stagger: 0.08, ease: "power3.out" }, "-=0.2");
    }

    if (hamburgerBtn && mobileMenu) {
        hamburgerBtn.addEventListener('click', () => {
            isMenuOpen = !isMenuOpen;
            hamburgerBtn.setAttribute('aria-expanded', isMenuOpen ? 'true' : 'false');
            mobileMenu.setAttribute('aria-hidden', isMenuOpen ? 'false' : 'true');
            if (isMenuOpen) {
                if (line1) line1.style.transform = 'rotate(45deg)';
                if (line2) line2.style.opacity = '0';
                if (line3) line3.style.transform = 'rotate(-45deg)';
                if (tlMenu) tlMenu.play();
                if (lenis) lenis.stop();
            } else {
                if (line1) line1.style.transform = 'rotate(0)';
                if (line2) line2.style.opacity = '1';
                if (line3) line3.style.transform = 'rotate(0)';
                if (tlMenu) tlMenu.reverse();
                if (lenis) lenis.start();
                setTimeout(closeAccordions, 350);
            }
        });

        // Fermeture sur touche Échap (Accessibilité WCAG)
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && isMenuOpen) {
                isMenuOpen = false;
                hamburgerBtn.setAttribute('aria-expanded', 'false');
                mobileMenu.setAttribute('aria-hidden', 'true');
                if (line1) line1.style.transform = 'rotate(0)';
                if (line2) line2.style.opacity = '1';
                if (line3) line3.style.transform = 'rotate(0)';
                if (tlMenu) tlMenu.reverse();
                if (lenis) lenis.start();
                setTimeout(closeAccordions, 350);
            }
        });
    }

    // Gestion des accordéons
    const accordionBtns = document.querySelectorAll('.accordion-btn');
    function closeAccordions() {
        document.querySelectorAll('.accordion-content').forEach(acc => {
            acc.style.maxHeight = null;
            acc.classList.remove('opacity-100');
        });
        document.querySelectorAll('.chevron').forEach(icon => {
            icon.classList.remove('rotate-180', 'text-brand');
        });
        accordionBtns.forEach(b => {
            b.classList.remove('text-brand');
            b.setAttribute('aria-expanded', 'false');
        });
    }

    accordionBtns.forEach(btn => {
        btn.addEventListener('click', function () {
            const content = this.nextElementSibling;
            const chevron = this.querySelector('.chevron');
            const isOpen = content.style.maxHeight;

            closeAccordions();

            if (!isOpen) {
                content.style.maxHeight = content.scrollHeight + "px";
                content.classList.add('opacity-100');
                if (chevron) chevron.classList.add('rotate-180', 'text-brand');
                this.classList.add('text-brand');
                this.setAttribute('aria-expanded', 'true');
            }
        });
    });

    // ==========================================
    // 4. Barre de Navigation Auto-Hide avec Hover
    // ==========================================
    const navMain = document.getElementById('main-nav');
    let lastScroll = 0;
    let isNavHovered = false;

    if (navMain) {
        navMain.addEventListener('mouseenter', () => { isNavHovered = true; });
        navMain.addEventListener('mouseleave', () => { isNavHovered = false; });

        const handleScroll = (currentScroll) => {
            if (isMenuOpen) return;
            if (currentScroll > 90) {
                if (currentScroll > lastScroll && !isNavHovered) {
                    navMain.style.transform = 'translateY(-150%)';
                } else if (currentScroll < lastScroll) {
                    navMain.style.transform = 'translateY(0)';
                }
            } else {
                navMain.style.transform = 'translateY(0)';
            }
            lastScroll = currentScroll;
        };

        if (lenis) {
            lenis.on('scroll', (e) => handleScroll(e.scroll ?? window.scrollY));
        } else {
            window.addEventListener('scroll', () => handleScroll(window.scrollY), { passive: true });
        }
    }

    // ==========================================
    // 5. Compte à Rebours (17 mai 2026 à 07:00)
    // ==========================================
    const countdownTarget = new Date('2027-05-16T07:00:00+02:00').getTime();
    const updateCountdown = () => {
        const now = new Date().getTime();
        const diff = countdownTarget - now;
        if (diff <= 0) return;

        const days = Math.floor(diff / (1000 * 60 * 60 * 24));
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((diff % (1000 * 60)) / 1000);

        const elDays = document.getElementById('cd-days');
        const elHours = document.getElementById('cd-hours');
        const elMinutes = document.getElementById('cd-minutes');
        const elSeconds = document.getElementById('cd-seconds');

        if (elDays) elDays.innerText = String(days).padStart(2, '0');
        if (elHours) elHours.innerText = String(hours).padStart(2, '0');
        if (elMinutes) elMinutes.innerText = String(minutes).padStart(2, '0');
        if (elSeconds) elSeconds.innerText = String(seconds).padStart(2, '0');
    };
    if (document.getElementById('cd-days')) {
        updateCountdown();
        setInterval(updateCountdown, 1000);
    }

    // ==========================================
    // 6. Mise en évidence du lien actif
    // ==========================================
    const currentPath = window.location.pathname.split('/').pop() || 'index.html';
    document.querySelectorAll('nav a').forEach(link => {
        const href = link.getAttribute('href');
        if (href && href === currentPath) {
            link.classList.add('text-brand');
            link.classList.remove('text-gray-300', 'text-gray-400');
        }
    });

    // ==========================================
    // 7. Rafraîchissement des repères ScrollTrigger après chargement complet
    // ==========================================
    window.addEventListener('load', () => {
        if (typeof ScrollTrigger !== 'undefined') {
            ScrollTrigger.refresh();
        }
    });

});
