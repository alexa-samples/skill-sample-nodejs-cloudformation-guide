
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

module.exports = {
    translation : {
        'welcome' : [
            'Te dy la bienvenidaa!'
        ],
        'error-prompt' : [
            'Qué tipo de error quieres disparar: tiempo agotado, respuesta invállida, o error en tiempo de ejecución?'
        ],
        'error-help' : [
            'Un error de timpo agotado o interrupción sucede cuando el Lambda tarda demasiado en responder. <break time="300ms"/>'
            + 'Una respuesta inválida sucede cuando el servicio de Alexa recibe una respuesta con propiedades inesperadas. <break time="300ms"/>'
            + 'Una excepción en tiemnpo de ejecución sucede cuando un error en el código Lambda impide que se complete la ejecución. <break time="300ms"/>'
        ],
        'error-reject' : [
            'No has dichio un tipo de error soportado.'
        ],
        'error-confirm' : [
            'Claro!  <break time="500ms"/>',
            'Tus deseos son órdenes!  <break time="500ms"/>',
            'Vale!  <break time="500ms"/>',
        ],
        'error-sound' : [
            '<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01"/>',
        ],
        'goodbye-default' : [
            'Adiós!'
        ],
        'goodbye-error' : [
            'Perdona, algo ha ido mal. Por favor inténtalo otra vez.'
        ],
    },
};