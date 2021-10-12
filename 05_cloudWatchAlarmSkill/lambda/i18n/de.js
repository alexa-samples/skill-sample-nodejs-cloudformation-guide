
/**
 * Copyright 2020 Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: LicenseRef-.amazon.com.-AmznSL-1.0
 * Licensed under the Amazon Software License  http://aws.amazon.com/asl/
**/

module.exports = {
    translation : {
        'welcome' : [
            'Willkommen!'
        ],
        'error-prompt' : [
            'Welche Art von Fehler möchtest Du hervorrufen: Ausbleibende Antwort, ungültige Antwort, oder Laufzeitfehler?'
        ],
        'error-help' : [
            'Eine ausbleibende Antwort entsteht wenn die Lambda-Funktion zu lange braucht um zu antworten. <break time="300ms"/>'
            + 'Eine ungültige Antwort enthält Inhalte, die Alexa nicht verarbeiten kann. <break time="300ms"/>'
            + 'Ein Laufzeitfehler ist, wenn die Ausführung der Lambda-Funktion aufgrund eines Fehlers vorzeitig abbricht. <break time="300ms"/>'
        ],
        'error-reject' : [
            'Das ist kein unterstützter Fehlertyp.'
        ],
        'error-confirm' : [
            'Gerne! <break time="500ms"/>',
            'Wie Du magst! <break time="500ms"/>',
            'Alles klar! <break time="500ms"/>',
        ],
        'error-sound' : [
            '<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01"/>',
        ],
        'goodbye-default' : [
            'Bis bald!'
        ],
        'goodbye-error' : [
            'Verzeihung, da ist etwas schief gelaufen. Bitte versuche er später nochmal.'
        ],
    },
};
