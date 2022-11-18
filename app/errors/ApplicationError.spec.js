const ApplicationError = require('./ApplicationError');

describe('ApplicationError', () => {
  describe('#getDetails', () => {
    it('should return empty object when called', () => {
      const applicationError = new ApplicationError('sus error');

      expect(applicationError.details).toEqual({});
    });
  });

  describe('#toJSON', () => {
    it('should return error object instance when called', () => {
      const applicationError = new ApplicationError('sus error');

      expect(applicationError.toJSON()).toEqual({
        error: {
          name: applicationError.name,
          message: applicationError.message,
          details: applicationError.details,
        },
      });
    });
  });
});
