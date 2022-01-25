exports.handler = (event, context, callback) => {
  callback(
    null,
    {
      statusCode: '200',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(
        {
          uid: 'urn:uuid:01234567-0123-4567-89ab-0123456789ab',
          updateDate: '2021-10-11T00:00:00.0Z',
          titleText: 'Cloud Formation Cookbook Update Number 1',
          mainText: 'Lorem ipsum dolor sit amet, consectetur adipiscing elit, sed do eiusmod tempor incididunt.',
          streamUrl: '',
          redirectionUrl: 'https://www.example.com/redirectionPage',
        },
      ),
    },
  );
};
