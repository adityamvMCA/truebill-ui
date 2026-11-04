import { Haptics, ImpactStyle } from "@capacitor/haptics";

let ctx;
const tone = (freq, ms) => {
  try {
    ctx = ctx || new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = freq;
    gain.gain.value = 0.15;
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + ms / 1000);
  } catch { /* audio unavailable */ }
};

const buzz = async (style) => {
  try { await Haptics.impact({ style }); }
  catch { navigator.vibrate?.(style === ImpactStyle.Heavy ? [80, 40, 80] : 40); }
};

export const feedbackOk = () => { tone(1100, 90); buzz(ImpactStyle.Medium); };
export const feedbackUnknown = () => { tone(260, 220); buzz(ImpactStyle.Heavy); };
