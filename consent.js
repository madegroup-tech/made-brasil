/* Banner de cookies (vanilla-cookieconsent v3) + Consent Mode do Google.
   O padrão "denied" é definido num script inline no <head> de cada página, antes do GTM. */
window.dataLayer = window.dataLayer || [];
window.gtag = window.gtag || function () { dataLayer.push(arguments); };

function atualizaConsentimento() {
  var ok = CookieConsent.acceptedCategory('analytics');
  gtag('consent', 'update', { analytics_storage: ok ? 'granted' : 'denied' });
  dataLayer.push({ event: 'consent_update', analytics_consent: ok });
}

CookieConsent.run({
  mode: 'opt-in',
  revision: 1,
  autoClearCookies: true,
  disablePageInteraction: false,
  guiOptions: {
    consentModal: { layout: 'box', position: 'bottom left', equalWeightButtons: true, flipButtons: false },
    preferencesModal: { layout: 'box', equalWeightButtons: true, flipButtons: false },
  },
  onFirstConsent: atualizaConsentimento,
  onConsent: atualizaConsentimento,
  onChange: atualizaConsentimento,
  categories: {
    necessary: { enabled: true, readOnly: true },
    analytics: {
      autoClear: { cookies: [{ name: /^_ga/ }, { name: '_gid' }] },
      services: { ga4: { label: 'Google Analytics 4 (medição de visitas e cliques)' } },
    },
  },
  language: {
    default: 'pt',
    translations: {
      pt: {
        consentModal: {
          title: 'Cookies no site da Made',
          description:
            'Usamos cookies necessários para o site funcionar e, só se você aceitar, cookies de análise para entender como o site é usado. Veja a <a href="/privacidade.html">política de privacidade</a>.',
          acceptAllBtn: 'Aceitar',
          acceptNecessaryBtn: 'Recusar',
          showPreferencesBtn: 'Preferências',
        },
        preferencesModal: {
          title: 'Preferências de cookies',
          acceptAllBtn: 'Aceitar todos',
          acceptNecessaryBtn: 'Recusar todos',
          savePreferencesBtn: 'Salvar preferências',
          closeIconLabel: 'Fechar',
          sections: [
            {
              title: 'Como usamos cookies',
              description:
                'Você escolhe o que permitir. Pode mudar de ideia quando quiser pelo link "Cookies" no rodapé. Detalhes na <a href="/privacidade.html">política de privacidade</a>.',
            },
            {
              title: 'Necessários',
              description: 'Guardam a sua escolha sobre cookies. Sem eles o site não lembra da sua preferência. Não podem ser desativados.',
              linkedCategory: 'necessary',
            },
            {
              title: 'Análise',
              description: 'Google Analytics: mostram como o site é usado (páginas, cliques, envio do formulário), sem identificar você pelo nome.',
              linkedCategory: 'analytics',
            },
          ],
        },
      },
    },
  },
});
