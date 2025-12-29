# Poster Studio

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Bun](https://img.shields.io/badge/bun-%23FBF0DF.svg?logo=bun&logoColor=black)

> Transforma cualquier imagen en un poster imprimible en múltiples hojas. Simple, gratuito y 100% local.

## 📖 Historia

Este proyecto nació de una necesidad personal: quería imprimir posters grandes en varias hojas para armarlos posteriormente, pero no encontraba una solución gratuita que funcionara bien.

Después de batallar con la impresora y las configuraciones, busqué herramientas online que pudieran separar una imagen en varias hojas. La única opción que encontré que funcionaba bien me **cobraba $5** por usarla.

En lugar de pagar, decidí escribir mi propia solución. **Unas horas después** tenía funcionando exactamente lo que necesitaba, y ahora lo comparto como software libre para que nadie más tenga que pagar por algo tan simple.

## ⚠️ Limitaciones

Este proyecto es **sencillo y está probado solo en un caso de uso específico**:

- ✅ **Solo PNG** - No soporta JPG, WebP u otros formatos
- ✅ **Diseñado para avisos con texto sencillo** - Funciona bien para posters de negocios con texto simple y bloques de color
- ❌ **NO para imágenes complejas** - Fotos, gradientes y diseños detallados perderán calidad
- ❌ **Escalado básico** - Usa `fit: contain` sin optimización de calidad, ideal para texto simple pero no para fotografías
- ❌ **Grid limitado** - Máximo 3×3 paneles, tamaños de papel: carta/oficio únicamente

## ✨ Características

- 🖼️ **Carga de imágenes PNG** - Sube cualquier imagen PNG directamente desde tu navegador
- 📐 **Configuración flexible**
  - Orientación: Vertical u horizontal
  - Tamaño de papel: Carta (Letter) u Oficio (Legal)
  - Grid personalizable: Hasta 3×3 paneles
- 👁️ **Preview en tiempo real** - Visualiza cómo quedará tu poster antes de imprimir
- 📄 **Exportación a PDF** - Genera un PDF listo para imprimir con todos los paneles
- 💾 **Persistencia automática** - Tu configuración se guarda automáticamente
- 🚀 **100% local** - Tus imágenes nunca salen de tu computadora
- 🎨 **Interfaz moderna** - Diseño oscuro con shadcn/ui y Tailwind CSS

## 🛠️ Stack Tecnológico

- **Runtime**: [Bun](https://bun.sh) - Fast JavaScript runtime
- **Frontend**: React 19 + TypeScript
- **UI**: shadcn/ui + Tailwind CSS
- **Server**: Bun.serve (Express-less)
- **Image Processing**: sharp
- **PDF Generation**: pdfkit

## 🚀 Instalación

```bash
# Instalar dependencias
bun install

# Iniciar servidor de desarrollo
bun dev
```

Abre [http://localhost:3000](http://localhost:3000) en tu navegador.

## 📦 Build & Production

```bash
# Build para producción
bun run build

# Ejecutar en modo producción
bun start
```

## 🎯 Uso

1. **Sube una imagen PNG** desde el panel lateral
2. **Configura** la orientación, tamaño de papel y grid (1-3 × 1-3)
3. **Previsualiza** el resultado en tiempo real
4. **Genera los paneles** con el botón "Generar Paneles"
5. **Exporta a PDF** para imprimir

## 🤝 Contribuir

¡Las contribuciones son bienvenidas! Si encuentras un bug o tienes una idea para mejorar:

1. Fork el proyecto
2. Crea una rama para tu feature (`git checkout -b feature/amazing-feature`)
3. Commit tus cambios (`git commit -m 'Add amazing feature'`)
4. Push a la rama (`git push origin feature/amazing-feature`)
5. Abre un Pull Request

## 📝 Licencia

Este proyecto está bajo la Licencia MIT - ver el archivo [LICENSE](LICENSE) para detalles.

## 👨‍💻 Autor

Creado por [Carlos González](https://github.com/carlos-glz) - liberado como software libre para la comunidad.

## 🙏 Agradecimientos

- [Bun](https://bun.sh) - Por hacer que el desarrollo sea increíblemente rápido
- [shadcn/ui](https://ui.shadcn.com) - Por los componentes UI de alta calidad
- [Lucide Icons](https://lucide.dev) - Por los iconos

---

**Hecho con ❤️ para evitar que alguien más tenga que pagar $5 por algo tan simple.**
