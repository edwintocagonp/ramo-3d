# Flor de Altura · Ramo 3D

Constructor de ramos en 3D para floristerías. El cliente elige las flores (ocho colores de rosa, girasoles e hortensias), el arreglo (mixto, por anillos o en forma de corazón), el relleno, el papel coreano, el lazo y los detalles (corona, mariposas, luces LED, chocolates, peluche y tarjeta), y ve su ramo armado en 3D con el precio al instante.

Con el ramo listo hay dos caminos:

- **Pedirlo**: elige fecha, horario y zona de Quito, y se abre WhatsApp con el pedido completo y un enlace al ramo en 3D. La floristería lo arma con flores reales.
- **Regalarlo como ramo digital**: se escribe para quién es, de quién y un mensaje, y se envía un enlace. Quien lo abre ve el ramo armándose flor por flor, con la tarjeta, y puede pedirlo de verdad desde ahí.

Flor de Altura es una floristería de ejemplo y los precios son referenciales.

## Tecnología

- React 19, TypeScript y Vite
- three.js con React Three Fiber y drei
- Postprocesado con bloom (para las luces LED), tone mapping neutral y viñeta
- Motion para las animaciones de la interfaz
- Nada descargado: flores, papel, osito, corona y texturas se generan por código

## Cómo se generan las flores

- **Rosa**: 22 pétalos en espiral áurea. Cada pétalo es una superficie que se ahueca y enrolla su borde hacia afuera; los de adentro se cierran y los de afuera se abren. Lleva cinco sépalos debajo.
- **Girasol**: disco de semillas en espiral de Fibonacci (pintado en un canvas) con dos coronas de pétalos.
- **Hortensia**: cúpula de 74 florecitas de cuatro pétalos.
- **Rendimiento**: todo se dibuja con mallas instanciadas, así que un ramo de 100 rosas (más de 2.000 pétalos) son unas pocas llamadas de dibujo. En celulares se usan pétalos más simples y sin sombras.
- **Disposición**: las cabezas se reparten sobre una cúpula en espiral áurea. En el arreglo de corazón, el primer color ocupa los puestos que caen dentro de la curva (x² + y² − 1)³ − x²y³ ≤ 0.

## Desarrollo

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # revisa los tipos y genera dist/
npm run preview  # sirve dist/
```

## Estructura

| Archivo | Contenido |
|---|---|
| `src/content.ts` | Datos de la floristería: flores, precios, papeles, extras, zonas de entrega y estilos |
| `src/design.ts` | El ramo del cliente y el regalo, y su lectura y escritura en la URL |
| `src/quote.ts` | Precio y mensajes de WhatsApp (pedido y regalo) |
| `src/scene/flowers.ts` | Geometría de los pétalos y plantillas de rosa, girasol y hortensia |
| `src/scene/arrange.ts` | Dónde va cada flor según el arreglo, y el relleno, el follaje y los extras |
| `src/scene/Bouquet.tsx` | Flores, tallos, gypsophila y eucalipto con mallas instanciadas |
| `src/scene/Wrap.tsx` | Papel coreano y lazo |
| `src/scene/Extras.tsx` | Corona, mariposas, luces, chocolates, osito, tarjeta y pétalos que caen |
| `src/scene/Stage.tsx` | Canvas, fondo, luces, cámara y postprocesado |
| `src/ui/` | Panel, ventanas de pedido y regalo, vista del regalo y pantalla de carga |

## Despliegue en Cloudflare Pages

- Comando de build: `npm run build`
- Directorio de salida: `dist`
- Versión de Node: la indica `.node-version` (22)
