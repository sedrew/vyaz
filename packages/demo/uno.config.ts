import { defineConfig } from 'unocss';
import presetWind from '@unocss/preset-wind';
import presetTypography from '@unocss/preset-typography';

export default defineConfig({
  presets: [presetWind(), presetTypography()],
});