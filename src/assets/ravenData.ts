// Símbolo editorial de O Inconveniente
// Corvo preto de traços afiados, com uma única pena vermelha na face

export const RAVEN_SVG = `
<svg viewBox="0 0 500 500" fill="none" xmlns="http://www.w3.org/2000/svg" class="w-full h-full max-h-[25rem] object-contain">
  <!-- Minimalist Black Raven Silhouette with Sharp Red Feather on Face -->
  <g id="corvo-editorial">
    <!-- Body and Wings (Deep Sharp Black) -->
    <path d="M260 90 C220 90 170 120 150 170 C130 220 120 280 90 350 C125 340 160 320 190 290 C185 330 170 380 135 430 C190 405 240 365 275 315 C285 360 270 410 240 450 C310 410 360 340 380 260 C395 200 375 140 330 105 C305 93 282 90 260 90 Z" fill="#171717"/>
    <!-- Head and Sharp Beak -->
    <path d="M260 90 C290 85 335 105 340 145 C345 155 375 160 425 168 C385 182 355 190 340 195 C330 230 310 255 280 270 C245 250 230 200 240 160 C245 130 252 105 260 90 Z" fill="#171717"/>
    <!-- Sleek Back and Tail Feathers -->
    <path d="M150 170 C130 210 110 270 70 340 C110 330 145 305 170 275 C140 340 105 400 45 460 C115 440 175 390 215 330 C205 375 180 435 140 480 C210 450 270 390 300 320 C270 300 240 270 220 230 C200 190 175 175 150 170 Z" fill="#111111"/>
    <!-- The Signature Sharp Red Feather on the Face (A pena vermelha afiada na face) -->
    <path d="M335 145 C355 140 385 148 405 155 C375 165 345 170 325 172 C330 160 332 152 335 145 Z" fill="#b91c28"/>
    <path d="M328 148 Q370 152 398 156 Q355 165 324 169 Z" fill="#dc2626"/>
    <!-- Eye Detail Accent (Subtle, observant gaze) -->
    <circle cx="318" cy="148" r="4.5" fill="#f8f8f5"/>
    <circle cx="319" cy="147.5" r="2" fill="#b91c28"/>
  </g>
</svg>
`;

export const RAVEN_IMAGE_BASE64 = `data:image/svg+xml;utf8,${encodeURIComponent(RAVEN_SVG)}`;
