/* eslint-disable no-trailing-spaces */
const AuthenticationController = require("./AuthenticationController")
const { EmailNotRegisteredError, InsufficientAccessError, RecordNotFoundError, WrongPasswordError, EmailAlreadyTakenError } = require("../errors")
const { JWT_SIGNATURE_KEY } = require("../../config/application")


const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { User, Role } = require("../models")

const mockRole = {
  id: 1,
  name: "CUSTOMER"
}

const mockUser = {
  id: 1,
  name: "bochi",
  email: "bochi@mail.com",
  password: '12345',
  image: 'bochi_image',
  roleId: 1
}

const mockUserResponse = {
  id: mockUser.id,
  name: mockUser.name,
  email: mockUser.email,
  encryptedPassword: bcrypt.hashSync(mockUser.password, 10),
  roleId: mockRole.id,
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("AuthenticationController", () => {
  describe("#authorize", () => {
    it("should return req.user and next function", async () => {
      const authenticationController = new AuthenticationController({ 
        userModel: {},
        roleModel: Role,
        bcrypt, 
        jwt
      })
      
      const mockToken = authenticationController.createTokenFromUser(mockUser, mockRole)

      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`
        }
      }
      const mockResponse = {}
      const mockNext = jest.fn()

      authenticationController.authorize("CUSTOMER")(mockRequest, mockResponse, mockNext)

      expect(mockNext).toBeCalled()
    })

    it("should been called status 401 and err json if wrong token", () => {
      const authenticationController = new AuthenticationController({ 
        userModel: {},
        roleModel: Role,
        bcrypt, 
        jwt
      })
          
      const mockRequest = {
        headers: {
          authorization: `Bearer `
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockNext = jest.fn()
    
      authenticationController.authorize(false)(mockRequest, mockResponse, mockNext)

      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          name: "JsonWebTokenError",
          message: "jwt must be provided",
          details: null
        }
      })
    })

    it("should call status 401 and err json if not authorized", () => {
      const authenticationController = new AuthenticationController({ 
        userModel: {},
        roleModel: Role,
        bcrypt, 
        jwt
      })
              
      const mockToken = authenticationController.createTokenFromUser(mockUser, mockRole)

      const mockRequest = {
        headers: {
          authorization: `Bearer ${mockToken}`
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockNext = jest.fn()
        
      authenticationController.authorize("ADMIN")(mockRequest, mockResponse, mockNext)

      const err = new InsufficientAccessError("CUSTOMER")
    
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
          details: err.details || null
        }
      })
    })
  })

  describe("#handleLogin", () => {
    it("should call respon status 201 and json with access token", async () => {
      const mockRequest = {
        body: {
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue({
          ...mockUserResponse,
          Role: mockRole,
        }),
      };

      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRole,
        bcrypt,
        jwt,
      });

      await controller.handleLogin(mockRequest, mockResponse, mockNext);
      const expectedToken = controller.createTokenFromUser(
        {...mockUserResponse, Role: mockRole}, mockRole,
      );

      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: expectedToken,
      })
    })

    it("should call status 404 and next function with err if user not found", async () => {
      const mockRequest = {
        body: {
          email: mockUser.email,
          password: mockUser.password,
        },
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();
    
      const mockUserModel = {
        findOne: jest.fn().mockReturnValue(null),
      };
    
      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRole,
        bcrypt,
        jwt,
      });
    
      await controller.handleLogin(mockRequest, mockResponse, mockNext);
      const expectedErr = new EmailNotRegisteredError(mockUser.email);

      expect(mockUserModel.findOne).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(404);
      expect(mockResponse.json).toHaveBeenCalledWith(expectedErr);
    })

    it("should call status 401 with json err if password wrong", async () => {
      const mockRequest = {
        body: {
          email: mockUser.email,
          password: "wrong",
        },
      };
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis(),
      };
      const mockNext = jest.fn();
        
      const mockUserModel = {
        findOne: jest.fn().mockReturnValue({
          ...mockUserResponse,
          Role: mockRole
        })
      }
        
      const controller = new AuthenticationController({
        userModel: mockUserModel,
        roleModel: mockRole,
        bcrypt,
        jwt,
      });
        
      await controller.handleLogin(mockRequest, mockResponse, mockNext);

      const mockErr = new WrongPasswordError()

      expect(mockUserModel.findOne).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(401)
      expect(mockResponse.json).toHaveBeenCalledWith(mockErr)
    })

    it("should call next function with err if error", async () => {
      const mockRequest = {
        body: {
          email: mockUser.email,
          password: "wrong"
        }
      }
      const mockNext = jest.fn()
      const mockUserModel = {
        findOne: jest.fn().mockRejectedValue(new Error("err"))
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRole, bcrypt, jwt })

      await authenticationController.handleLogin(mockRequest, {}, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe("#handleRegister", () => {
    it("should call status 201 and json if register success", async () => {
      const mockRequest = {
        body: {
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockNext = jest.fn()

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue(mockUserResponse)
      }
      const mockRoleModel = {
        findOne: jest.fn().mockReturnValue(mockRole)
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRoleModel, bcrypt, jwt })

      await authenticationController.handleRegister(mockRequest, mockResponse, mockNext)

      const mockToken = authenticationController.createTokenFromUser(mockUserResponse, mockRole)

      expect(mockUserModel.create).toHaveBeenCalled();
      expect(mockResponse.status).toHaveBeenCalledWith(201);
      expect(mockResponse.json).toHaveBeenCalledWith({
        accessToken: mockToken
      })
    })

    it("should call status 422 and json err if user already exist", async () => {
      const mockRequest = {
        body: {
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockNext = jest.fn()

      const mockUserModel = {
        findOne: jest.fn().mockReturnValue(true)
      }
      const mockRoleModel = {
        findOne: jest.fn().mockReturnValue(mockRole)
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRoleModel, bcrypt, jwt })

      await authenticationController.handleRegister(mockRequest, mockResponse, mockNext)

      const mockErr = new EmailAlreadyTakenError(mockUser.email)

      expect(mockUserModel.findOne).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(422)
      expect(mockResponse.json).toHaveBeenCalledWith(mockErr)
    })

    it("should call next function with err if error", async () => {
      const mockRequest = {
        body: {
          name: mockUser.name,
          email: mockUser.email,
          password: mockUser.password
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockNext = jest.fn()

      const mockUserModel = {
        findOne: jest.fn().mockRejectedValue(new Error("err"))
      }
      const mockRoleModel = {
        findOne: jest.fn().mockReturnValue(mockRole)
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRoleModel, bcrypt, jwt })

      await authenticationController.handleRegister(mockRequest, mockResponse, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe("#handlegetuser", () => {
    it("should call status 200 with data user", async () => {
      const mockRequest = {
        user: mockUser
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockUserModel = {
        findByPk: jest.fn().mockReturnValue(mockUser)
      }

      const mockRoleModel = {
        findByPk: jest.fn().mockReturnValue(true)
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRoleModel, bcrypt, jwt })

      await authenticationController.handleGetUser(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(mockUser)
    })

    it("should call status 404 with error record not found if user not found", async () => {
      const mockRequest = {
        user: mockUser
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockUserModel = {
        findByPk: jest.fn().mockReturnValue(false)
      }

      const mockRoleModel = {
        findByPk: jest.fn().mockReturnValue(false)
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRoleModel, bcrypt, jwt })

      await authenticationController.handleGetUser(mockRequest, mockResponse)

      const mockErr = new RecordNotFoundError(mockUser.name)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith(mockErr)
    })
    
    it("should call status 404 with error record not found if role not found", async () => {
      const mockRequest = {
        user: mockUser
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockUserModel = {
        findByPk: jest.fn().mockReturnValue(mockUser)
      }

      const mockRoleModel = {
        findByPk: jest.fn().mockReturnValue(false)
      }

      const authenticationController = new AuthenticationController({ userModel: mockUserModel, roleModel: mockRoleModel, bcrypt, jwt })

      await authenticationController.handleGetUser(mockRequest, mockResponse)

      const mockErr = new RecordNotFoundError(mockUser.name)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith(mockErr)
    })
  })

  describe("#createTokenFromUser", () => {
    it("should return json web token", () => {
      const authenticationController = new AuthenticationController({ User, Role, bcrypt, jwt })

      const mockToken = authenticationController.createTokenFromUser(mockUser, mockRole)

      const expectToken = jwt.sign({
        id: mockUser.id,
        name: mockUser.name,
        email: mockUser.email,
        image: mockUser.image,
        role: {
          id: mockRole.id,
          name: mockRole.name
        }
      }, JWT_SIGNATURE_KEY)

      expect(mockToken).toEqual(expectToken)
    })
  })

  describe("#decodeToken", () => {
    it("should return decode token", () => {
      const mockUser = {
        id: 1,
        name: "bochi",
        email: "bochi@mail.com",
        image: 'bochi_image',
        role: {
          id: mockRole.id,
          name: mockRole.name
        }
      }
      const mockToken = jwt.sign(mockUser, JWT_SIGNATURE_KEY)

      const authenticationController = new AuthenticationController({ User, Role, bcrypt, jwt })

      const expectDecode = authenticationController.decodeToken(mockToken)
      delete expectDecode.iat

      expect(expectDecode).toEqual(mockUser)
    })
  })

  describe("#encryptPassword", () => {
    it("should return encrypted password", () => {
      const mockPassword = mockUser.password

      const authenticationController = new AuthenticationController({ User, Role, bcrypt, jwt })

      const expectPassword = authenticationController.encryptPassword(mockPassword)

      expect(bcrypt.compareSync(mockPassword, expectPassword)).toEqual(true)
    })
  })

  describe("#verifyPassword", () => {
    it("should return true", () => {
      const mockPassword = mockUser.password
      const authenticationController = new AuthenticationController({ User, Role, bcrypt, jwt })
      const mockEncryptPass = authenticationController.encryptPassword(mockPassword)
      
      const result = authenticationController.verifyPassword(mockPassword, mockEncryptPass)

      expect(result).toEqual(true)
    })
  })
})
