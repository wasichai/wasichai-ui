// the assistant's own strings, loaded under the namespace 'agent'. key paths match the original app, so the
// ported page keeps calling t('assistant.title').
export const agentMessages = {
  es: {
    nav: { assistant: 'Asistente' },
    assistant: {
      title: 'Asistente',
      scope: 'Responde sobre los datos de tu organización y solo ve lo que tu usuario tiene permiso de ver.',
      model: 'Modelo',
      placeholder: 'Pregunta sobre tus objetos, registros o geometrías…',
      send: 'Preguntar',
      sending: 'Consultando…',
      you: 'Tú',
      agent: 'Asistente',
      thinking: 'Consultando los datos…',
      emptyTitle: 'Todavía no has preguntado nada',
      emptyHint: 'El asistente consulta la API de Wasichai con tu sesión y muestra las herramientas que usó.',
      suggestionsTitle: 'Para empezar',
      suggestionObjects: '¿Qué objetos hay definidos y cuántos campos tiene cada uno?',
      suggestionRecords: '¿Cuántos registros hay en cada objeto?',
      suggestionGeometry: '¿Qué objetos tienen geometría y en qué SRID?',
      showSteps: 'Ver los pasos ({{n}})',
      hideSteps: 'Ocultar los pasos',
      stepsTitle: 'Herramientas usadas',
      tool: 'Herramienta',
      noArguments: 'Sin argumentos',
      noSteps: 'El asistente respondió sin consultar datos.',
      truncated: 'Respuesta incompleta',
      truncatedHint: 'El asistente alcanzó su límite de pasos y se detuvo. Revisa las herramientas usadas antes de dar el resultado por bueno.',
      failed: 'La consulta falló',
      disabled: 'El asistente no está configurado',
      disabledHint: 'Falta la configuración del modelo en el servidor. El resto de Wasichai sigue funcionando con normalidad.'
    }
  },
  en: {
    nav: { assistant: 'Assistant' },
    assistant: {
      title: 'Assistant',
      scope: 'It answers about your organization data and only sees what your user is allowed to see.',
      model: 'Model',
      placeholder: 'Ask about your objects, records or geometries…',
      send: 'Ask',
      sending: 'Asking…',
      you: 'You',
      agent: 'Assistant',
      thinking: 'Querying the data…',
      emptyTitle: 'You have not asked anything yet',
      emptyHint: 'The assistant queries the Wasichai API with your session and shows the tools it used.',
      suggestionsTitle: 'To get started',
      suggestionObjects: 'Which objects are defined and how many fields does each one have?',
      suggestionRecords: 'How many records are there in each object?',
      suggestionGeometry: 'Which objects have geometry and in which SRID?',
      showSteps: 'Show the steps ({{n}})',
      hideSteps: 'Hide the steps',
      stepsTitle: 'Tools used',
      tool: 'Tool',
      noArguments: 'No arguments',
      noSteps: 'The assistant answered without querying any data.',
      truncated: 'Incomplete answer',
      truncatedHint: 'The assistant hit its step limit and stopped. Check the tools it used before taking the result as final.',
      failed: 'The request failed',
      disabled: 'The assistant is not configured',
      disabledHint: 'The model configuration is missing on the server. The rest of Wasichai keeps working normally.'
    }
  }
}
