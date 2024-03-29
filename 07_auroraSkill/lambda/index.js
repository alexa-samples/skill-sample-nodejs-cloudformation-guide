// This sample demonstrates handling intents from an Alexa skill using the Alexa Skills Kit SDK v2.
// Please visit https://alexa.design/cookbook for additional examples on implementing slots, dialog management,
// session persistence, api calls, and more.
const _get = require('lodash.get');
const Alexa = require('ask-sdk-core');
const cfnResponse = require('cfn-response-promise');

const config = require('./config');
const database = require('./database');

const CloudFormationHandler = {
  canHandle(handlerInput) {
    return [
      'Create',
      'Update',
      'Delete',
    ].includes(
      _get(handlerInput, 'requestEnvelope.RequestType'),
    );
  },
  async handle(handlerInput) {
    console.log(`CloudFormation request: ${JSON.stringify(handlerInput)}`);

    let result = {};
    if (
      _get(handlerInput, 'requestEnvelope.RequestType') === 'Create'
    ) {
      console.log('Creating User table...');
      try {
        result = await database.createUserTable();
      } catch (error) {
        result = error;
      }
      console.log(`User table creation result: ${
        JSON.stringify(result, null, 4)
      }`);
    }

    await cfnResponse.send(
      _get(handlerInput, 'requestEnvelope'),
      _get(handlerInput, 'context'),
      cfnResponse.SUCCESS,
      result,
    );
  },
};

const NewSessionHandler = {
  canHandle(handlerInput) {
    return !!_get(handlerInput, 'requestEnvelope.session.new');
  },
  async handle(handlerInput) {
    const userId = _get(handlerInput, 'requestEnvelope.session.user.userId');
    const sessionCount = await database.getUserSessionCount(userId);

    const speakOutput = `Welcome! This is your <say-as interpret-as="ordinal">${
      sessionCount ? sessionCount + 1 : 1
    }</say-as> session. Take care, and see you next time!`;

    if (
      String(sessionCount) === 'undefined'
    ) {
      database.saveUserData(
        userId,
        1,
      );
    } else {
      database.updateUserData(
        userId,
        sessionCount + 1,
      );
    }

    return handlerInput.responseBuilder
      .speak(speakOutput)
      .getResponse();
  },
};

const SessionEndedRequestHandler = {
  canHandle(handlerInput) {
    return Alexa.getRequestType(handlerInput.requestEnvelope) === 'SessionEndedRequest';
  },
  handle(handlerInput) {
    // Any cleanup logic goes here.
    return handlerInput.responseBuilder.getResponse();
  },
};

// Generic error handling to capture any syntax or routing errors. If you receive an error
// stating the request handler chain is not found, you have not implemented a handler for
// the intent being invoked or included it in the skill builder below.
const ErrorHandler = {
  canHandle() {
    return true;
  },
  handle(handlerInput, error) {
    console.log(`~~~~ Error handled: ${error.stack}`);

    const stack = error.stack.split('\n');
    const errorLocation = stack[1].match(/\/([a-zA-Z0-9_\-.]+):(\d+):\d+/);
    console.log(`Error location match: ${
      JSON.stringify(errorLocation, null, 4)
    }`);

    let speakOutput = '<audio src="soundbank://soundlibrary/ui/gameshow/amzn_ui_sfx_gameshow_negative_response_01"/>';
    if (
      config.debugMode
      && errorLocation
    ) {
      speakOutput = `<lang xml:lang="en-US">${error.message
      } <break time='200ms'/> Check ${errorLocation[1]
      }, line ${errorLocation[2]
      }</lang>`;
    }
    return handlerInput.responseBuilder
      .speak(speakOutput)
      .withShouldEndSession(undefined)
      .getResponse();
  },
};

// The SkillBuilder acts as the entry point for your skill, routing all request and response
// payloads to the handlers above. Make sure any new handlers or interceptors you've
// defined are included below. The order matters - they're processed top to bottom.
exports.handler = Alexa.SkillBuilders.custom()
  .addRequestHandlers(
    CloudFormationHandler,
    NewSessionHandler,
    SessionEndedRequestHandler,
  )
  .addErrorHandlers(
    ErrorHandler,
  )
  .lambda();
