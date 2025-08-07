class ImageSlider {
    constructor(options) {
        this.sliderImagesContainer = document.getElementById(options.sliderImagesId);
        this.prevButton = document.querySelector(options.prevButtonSelector);
        this.nextButton = document.querySelector(options.nextButtonSelector);
        this.sliderDotsContainer = document.getElementById(options.sliderDotsId);
        this.jsonServerUrl = options.jsonServerUrl;
        this.autoSlideInterval = options.autoSlideInterval || 5000;
        this.autoSlideTimer = null;
        this.currentIndex = 0;
        this.photos = [];
        this.initialized = false;

        this.touchStartX = 0;
        this.touchEndX = 0;
        this.resizeTimer = null;

        this.init();
    }

    //#region Inicialização
    async init() {
        if (this.initialized) return;
        await this.fetchPhotos();

        if (this.photos.length > 0) {
            this.renderSlider();
            this.renderDots();
            this.updateSlider();
            this.addEventListeners();
            this.startAutoSlide();
            this.initialized = true;
        } else {
            this.displayErrorMessage('Não foi possível carregar as imagens. Verifique o servidor JSON.');
        }
    }

    async fetchPhotos() {
        try {
            const response = await fetch(this.jsonServerUrl);
            if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
            this.photos = await response.json();
        } catch (error) {
            console.error('Erro ao buscar fotos:', error);
            this.photos = [];
        }
    }
    //#endregion

    //#region Renderização
    renderSlider() {
        this.sliderImagesContainer.innerHTML = '';
        this.photos.forEach((photo, index) => {
            const sliderItem = document.createElement('div');
            sliderItem.classList.add('slider-item');
            sliderItem.dataset.index = index;
            sliderItem.tabIndex = 0;

            const img = document.createElement('img');
            img.src = photo.imagem;
            img.alt = photo.legenda;
            img.loading = 'lazy';

            const caption = document.createElement('div');
            caption.classList.add('slider-caption');
            caption.innerHTML = `<h3>${photo.legenda}</h3><p>Data: ${photo.data}</p>`;

            sliderItem.appendChild(img);
            sliderItem.appendChild(caption);
            this.sliderImagesContainer.appendChild(sliderItem);
        });
    }

    renderDots() {
        this.sliderDotsContainer.innerHTML = '';
        this.photos.forEach((_, index) => {
            const dot = document.createElement('span');
            dot.classList.add('dot');
            dot.setAttribute('role', 'tab');
            dot.setAttribute('aria-controls', `slide-${index}`);
            dot.setAttribute('aria-label', `Ir para a imagem ${index + 1}`);
            dot.dataset.index = index;
            dot.tabIndex = 0;

            if (index === this.currentIndex) {
                dot.classList.add('active');
                dot.setAttribute('aria-selected', 'true');
            } else {
                dot.setAttribute('aria-selected', 'false');
            }

            this.sliderDotsContainer.appendChild(dot);
        });
    }
    //#endregion

    //#region Atualização de slide
    updateSlider() {
        if (this.photos.length === 0) return;

        const firstItem = this.sliderImagesContainer.querySelector('.slider-item');
        if (!firstItem) return;

        const imageWidth = firstItem.clientWidth;

        requestAnimationFrame(() => {
            this.sliderImagesContainer.style.transform = `translateX(-${this.currentIndex * imageWidth}px)`;
        });

        document.querySelectorAll('.dot').forEach((dot, index) => {
            dot.classList.toggle('active', index === this.currentIndex);
            dot.setAttribute('aria-selected', index === this.currentIndex ? 'true' : 'false');
        });

        document.querySelectorAll('.slider-item').forEach((item, index) => {
            item.setAttribute('aria-hidden', index !== this.currentIndex);
        });
    }
    //#endregion

    //#region Navegação
    showNextImage() {
        if (this.photos.length <= 1) return;
        this.currentIndex = (this.currentIndex + 1) % this.photos.length;
        this.updateSlider();
        this.resetAutoSlide();
    }

    showPrevImage() {
        if (this.photos.length <= 1) return;
        this.currentIndex = (this.currentIndex - 1 + this.photos.length) % this.photos.length;
        this.updateSlider();
        this.resetAutoSlide();
    }

    goToImage(index) {
        if (index >= 0 && index < this.photos.length) {
            this.currentIndex = index;
            this.updateSlider();
            this.resetAutoSlide();
        }
    }
    //#endregion

    //#region Auto Slide
    startAutoSlide() {
        if (this.photos.length > 1) {
            clearInterval(this.autoSlideTimer);
            this.autoSlideTimer = setInterval(() => this.showNextImage(), this.autoSlideInterval);
        }
    }

    resetAutoSlide() {
        clearInterval(this.autoSlideTimer);
        this.startAutoSlide();
    }
    //#endregion

    //#region Eventos
    addEventListeners() {
        this.nextButton.addEventListener('click', () => this.showNextImage());
        this.prevButton.addEventListener('click', () => this.showPrevImage());

        this.sliderDotsContainer.addEventListener('click', (event) => {
            if (event.target.classList.contains('dot')) {
                const index = parseInt(event.target.dataset.index);
                this.goToImage(index);
            }
        });

        this.sliderDotsContainer.addEventListener('keydown', (event) => {
            if (event.key === 'Enter' && event.target.classList.contains('dot')) {
                const index = parseInt(event.target.dataset.index);
                this.goToImage(index);
            }
        });

        // Responsivo
        window.addEventListener('resize', () => {
            clearTimeout(this.resizeTimer);
            this.resizeTimer = setTimeout(() => this.updateSlider(), 250);
        });

        // Hover pause
        this.sliderImagesContainer.addEventListener('mouseenter', () => clearInterval(this.autoSlideTimer));
        this.sliderImagesContainer.addEventListener('mouseleave', () => this.startAutoSlide());

        // Swipe touch (mobile)
        this.sliderImagesContainer.addEventListener('touchstart', (e) => this.touchStartX = e.changedTouches[0].clientX);
        this.sliderImagesContainer.addEventListener('touchend', (e) => {
            this.touchEndX = e.changedTouches[0].clientX;
            const diff = this.touchStartX - this.touchEndX;
            if (Math.abs(diff) > 50) {
                diff > 0 ? this.showNextImage() : this.showPrevImage();
            }
        });

        // Pausa quando a aba está oculta (performance)
        document.addEventListener('visibilitychange', () => {
            if (document.hidden) clearInterval(this.autoSlideTimer);
            else this.startAutoSlide();
        });
    }
    //#endregion

    displayErrorMessage(message) {
        this.sliderImagesContainer.innerHTML = `<p class="error-message">${message}</p>`;
        this.prevButton.style.display = 'none';
        this.nextButton.style.display = 'none';
        this.sliderDotsContainer.style.display = 'none';
    }
}

// Inicialização
document.addEventListener('DOMContentLoaded', () => {
    const jsonServerEndpoint = 'http://localhost:3000/fotos';

    new ImageSlider({
        sliderImagesId: 'sliderImages',
        prevButtonSelector: '.slider-button--prev',
        nextButtonSelector: '.slider-button--next',
        sliderDotsId: 'sliderDots',
        jsonServerUrl: jsonServerEndpoint,
        autoSlideInterval: 7000
    });
});
