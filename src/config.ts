export const cfg = {
  port: Number(process.env.PORT ?? 4000),
  spotify: {
    clientId: process.env.SPOTIFY_CLIENT_ID ?? "",
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET ?? "",
    redirectUri: process.env.SPOTIFY_REDIRECT_URI ?? "http://localhost:4000/callback",
    pollMs: Number(process.env.POLL_MS ?? 4000),
    redemptionId: process.env.REDEMPTION_ID ?? "",
    actions: {
      getRedeems: process.env.ACTION_GET_REDEEMS ?? "",
      sendMessage: process.env.ACTION_SEND_MESSAGE ?? "",
      rejectRedemption: process.env.ACTION_REJECT_REDEMPTION ?? "",
      aceptRedemption: process.env.ACTION_ACEPT_REDEMPTION ?? "",
    }
  },
  printer: {
    enabled: process.env.PRINTER_ENABLED === 'true',
    port: process.env.PRINTER_PORT ?? (process.platform === 'win32' ? 'COM4' : '/dev/rfcomm0'),
    baudRate: 9600,
    fontRegular: process.env.PRINTER_FONT_REGULAR ?? "C:/Windows/Fonts/arial.ttf",
    fontBold: process.env.PRINTER_FONT_BOLD ?? "C:/Windows/Fonts/arialbd.ttf",
    width: 384,
    bt: {
      mac: process.env.PRINTER_BT_MAC ?? "",
      channel: Number(process.env.PRINTER_BT_CHANNEL ?? 2),
    },
    photo: {
      maxWidth: 220,
      maxHeight: 220,
    }
  }
};
