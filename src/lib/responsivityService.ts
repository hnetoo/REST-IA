// Sistema de Responsividade Automática

export interface ScreenSize {
  width: number;
  height: number;
  ratio: number;
  category: 'mobile' | 'tablet' | 'desktop' | 'large-desktop' | 'ultra-wide';
  type: 'portrait' | 'landscape';
  density: number; // pixels por polegada
}

export interface ResponsiveConfig {
  fontSize: number;
  padding: number;
  gap: number;
  iconSize: number;
  cardSize: 'small' | 'medium' | 'large';
  layout: 'compact' | 'normal' | 'spacious';
  sidebarWidth: number;
  headerHeight: number;
  category: ScreenSize['category'];
}

class ResponsivityService {
  private currentScreen: ScreenSize;
  private currentConfig: ResponsiveConfig;
  private listeners: ((config: ResponsiveConfig) => void)[] = [];
  private resizeObserver: ResizeObserver | null = null;
  private mediaQueries: MediaQueryList[] = [];

  constructor() {
    this.currentScreen = this.detectScreenSize();
    this.currentConfig = this.generateConfig(this.currentScreen);
    this.setupResizeDetection();
    this.setupMediaQueries();
    this.applyConfig();
  }

  private detectScreenSize(): ScreenSize {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const ratio = width / height;
    
    // Determinar categoria baseada no width
    let category: ScreenSize['category'];
    if (width < 768) {
      category = 'mobile';
    } else if (width < 1024) {
      category = 'tablet';
    } else if (width < 1440) {
      category = 'desktop';
    } else if (width < 1920) {
      category = 'large-desktop';
    } else {
      category = 'ultra-wide';
    }

    // Detectar densidade de pixels
    const density = window.devicePixelRatio || 1;

    return {
      width,
      height,
      ratio,
      category,
      type: width > height ? 'landscape' : 'portrait',
      density
    };
  }

  private generateConfig(screen: ScreenSize): ResponsiveConfig {
    const baseConfig = this.getBaseConfig(screen.category);
    const densityMultiplier = Math.min(screen.density, 2); // Limitar a 2x
    
    // Ajustar baseado na orientação
    if (screen.type === 'portrait') {
      baseConfig.fontSize *= 0.9;
      baseConfig.padding *= 0.8;
      baseConfig.sidebarWidth = Math.min(baseConfig.sidebarWidth, 200);
    }

    // Ajustar baseado no ratio (ecrãs muito largos)
    if (screen.ratio > 2) {
      baseConfig.layout = 'spacious';
      baseConfig.gap *= 1.2;
    } else if (screen.ratio < 1) {
      baseConfig.layout = 'compact';
      baseConfig.gap *= 0.8;
    }

    // Aplicar multiplicador de densidade
    baseConfig.fontSize *= densityMultiplier;
    baseConfig.iconSize = Math.round(baseConfig.iconSize * densityMultiplier);
    baseConfig.category = screen.category;

    return baseConfig;
  }

  private getBaseConfig(category: ScreenSize['category']): ResponsiveConfig {
    switch (category) {
      case 'mobile':
        return {
          fontSize: 12,
          padding: 8,
          gap: 8,
          iconSize: 16,
          cardSize: 'small',
          layout: 'compact',
          sidebarWidth: 60,
          headerHeight: 48,
          category: 'mobile'
        };
      
      case 'tablet':
        return {
          fontSize: 13,
          padding: 12,
          gap: 12,
          iconSize: 18,
          cardSize: 'medium',
          layout: 'normal',
          sidebarWidth: 80,
          headerHeight: 56,
          category: 'tablet'
        };
      
      case 'desktop':
        return {
          fontSize: 14,
          padding: 16,
          gap: 16,
          iconSize: 20,
          cardSize: 'medium',
          layout: 'normal',
          sidebarWidth: 280,
          headerHeight: 64,
          category: 'desktop'
        };
      
      case 'large-desktop':
        return {
          fontSize: 15,
          padding: 20,
          gap: 20,
          iconSize: 22,
          cardSize: 'large',
          layout: 'spacious',
          sidebarWidth: 320,
          headerHeight: 72,
          category: 'large-desktop'
        };
      
      case 'ultra-wide':
        return {
          fontSize: 16,
          padding: 24,
          gap: 24,
          iconSize: 24,
          cardSize: 'large',
          layout: 'spacious',
          sidebarWidth: 360,
          headerHeight: 80,
          category: 'ultra-wide'
        };
      
      default:
        return this.getBaseConfig('desktop');
    }
  }

  private setupResizeDetection() {
    // Usar ResizeObserver para detectar mudanças no viewport
    if (window.ResizeObserver) {
      this.resizeObserver = new ResizeObserver((entries) => {
        for (const entry of entries) {
          const { width, height } = entry.contentRect;
          this.updateScreenSize(width, height);
        }
      });
      
      // Observar o documentElement
      this.resizeObserver.observe(document.documentElement);
    } else {
      // Fallback para window resize
      window.addEventListener('resize', this.handleResize.bind(this));
    }
  }

  private setupMediaQueries() {
    // Configurar media queries para diferentes breakpoints
    const queries = [
      '(max-width: 767px)',
      '(min-width: 768px) and (max-width: 1023px)',
      '(min-width: 1024px) and (max-width: 1439px)',
      '(min-width: 1440px) and (max-width: 1919px)',
      '(min-width: 1920px)',
      '(orientation: portrait)',
      '(orientation: landscape)'
    ];

    this.mediaQueries = queries.map(query => window.matchMedia(query));
    
    this.mediaQueries.forEach(mq => {
      mq.addEventListener('change', this.handleMediaQueryChange.bind(this));
    });
  }

  private handleResize() {
    this.updateScreenSize(window.innerWidth, window.innerHeight);
  }

  private handleMediaQueryChange() {
    this.updateScreenSize(window.innerWidth, window.innerHeight);
  }

  private updateScreenSize(width: number, height: number) {
    const newScreen: ScreenSize = {
      width,
      height,
      ratio: width / height,
      category: this.getCategoryFromWidth(width),
      type: width > height ? 'landscape' : 'portrait',
      density: window.devicePixelRatio || 1
    };

    // Verificar se houve mudança significativa
    if (this.hasSignificantChange(this.currentScreen, newScreen)) {
      this.currentScreen = newScreen;
      this.currentConfig = this.generateConfig(newScreen);
      this.applyConfig();
      this.notifyListeners();
    }
  }

  private getCategoryFromWidth(width: number): ScreenSize['category'] {
    if (width < 768) return 'mobile';
    if (width < 1024) return 'tablet';
    if (width < 1440) return 'desktop';
    if (width < 1920) return 'large-desktop';
    return 'ultra-wide';
  }

  private hasSignificantChange(old: ScreenSize, current: ScreenSize): boolean {
    return (
      old.category !== current.category ||
      old.type !== current.type ||
      Math.abs(old.width - current.width) > 100 ||
      Math.abs(old.height - current.height) > 100
    );
  }

  private applyConfig() {
    const root = document.documentElement;
    const body = document.body;
    
    // Aplicar CSS variables
    root.style.setProperty('--responsive-font-size', `${this.currentConfig.fontSize}px`);
    root.style.setProperty('--responsive-padding', `${this.currentConfig.padding}px`);
    root.style.setProperty('--responsive-gap', `${this.currentConfig.gap}px`);
    root.style.setProperty('--responsive-icon-size', `${this.currentConfig.iconSize}px`);
    root.style.setProperty('--responsive-sidebar-width', `${this.currentConfig.sidebarWidth}px`);
    root.style.setProperty('--responsive-header-height', `${this.currentConfig.headerHeight}px`);
    
    // Aplicar classes ao body
    body.className = body.className.replace(/responsive-\w+/g, '');
    body.classList.add(`responsive-${this.currentConfig.category}`);
    body.classList.add(`responsive-${this.currentConfig.layout}`);
    body.classList.add(`responsive-${this.currentScreen.type}`);
    body.classList.add(`responsive-${this.currentConfig.cardSize}`);
    
    // Salvar no localStorage
    localStorage.setItem('responsive-config', JSON.stringify(this.currentConfig));
    
    // Log da mudança
    console.log('[RESPONSIVITY] Config applied:', {
      screen: this.currentScreen,
      config: this.currentConfig
    });
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener(this.currentConfig));
  }

  // Métodos públicos
  public getCurrentConfig(): ResponsiveConfig {
    return { ...this.currentConfig };
  }

  public getCurrentScreen(): ScreenSize {
    return { ...this.currentScreen };
  }

  public subscribe(listener: (config: ResponsiveConfig) => void): () => void {
    this.listeners.push(listener);
    
    // Retornar função de unsubscribe
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  public forceUpdate() {
    this.updateScreenSize(window.innerWidth, window.innerHeight);
  }

  public isMobile(): boolean {
    return this.currentScreen.category === 'mobile';
  }

  public isTablet(): boolean {
    return this.currentScreen.category === 'tablet';
  }

  public isDesktop(): boolean {
    return ['desktop', 'large-desktop', 'ultra-wide'].includes(this.currentScreen.category);
  }

  public isPortrait(): boolean {
    return this.currentScreen.type === 'portrait';
  }

  public isLandscape(): boolean {
    return this.currentScreen.type === 'landscape';
  }

  public destroy() {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }
    
    this.mediaQueries.forEach(mq => {
      mq.removeEventListener('change', this.handleMediaQueryChange.bind(this));
    });
    
    window.removeEventListener('resize', this.handleResize.bind(this));
    this.listeners = [];
  }
}

// Exportar instância global
export const responsivityService = new ResponsivityService();
