const CarController = require("./CarController")
const dayjs = require("dayjs")
const { Op } = require('sequelize');
const {
  CarAlreadyRentedError
} = require('../errors')

const mockCar = {
  id: 1,
  name: 'Avanza',
  price: 100000,
  size: 'LARGE',
  image: 'avanza_ini',
  isCurrentlyRented: false
}

const mockUserCar = {
  id: 1,
  userId: 1,
  carId: 1,
  rentStartedAt: null,
  rentEndedAt: null,
  createdAt: null,
  updatedAt: null
}

describe("CarController", () => {
  describe("#handleListCars", () => {
    it("should return status 200 with data cars with pagination", async () => {
      const mockRequest = {
        query: {}
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockCarList = []

      for (let i = 0; i < 10; i++) {
        mockCarList.push({
          ...mockCar,
          id: i + 1
        })
      }

      const mockCarModel = {
        findAll: jest.fn().mockReturnValue(mockCarList),
        count: jest.fn().mockReturnValue(10)
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleListCars(mockRequest, mockResponse)
      const expectedPagination = carController.buildPaginationObject(mockRequest, 10)

      expect(mockCarModel.findAll).toHaveBeenCalled()
      expect(mockCarModel.count).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        cars: mockCarList,
        meta: {
          pagination: expectedPagination
        }
      })
    })
  })

  describe("#handleGetCar", () => {
    it("should call status 200 and data car", async () => {
      const mockRequest = {
        params: {
          id: 1
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(mockCar)
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleGetCar(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith(mockCar)
    })
  })

  describe("#handleCreateCar", () => {
    it("should call status 201 and data car", async () => {
      const mockRequest = {
        body: {
          name: mockCar.name,
          price: mockCar.price,
          size: mockCar.size,
          image: mockCar.image
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockCarModel = {
        create: jest.fn().mockReturnValue(mockCar)
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleCreateCar(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith(mockCar)
    })

    it("should call status 422 with error data", async () => {
      const mockRequest = {
        body: {
          name: mockCar.name,
          price: mockCar.price,
          size: mockCar.size,
          image: mockCar.image
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const err = new Error("err this")

      const mockCarModel = {
        create: jest.fn().mockReturnValue(Promise.reject(err))
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleCreateCar(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(422)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message
        }
      })
    })
  })

  describe("#handleRentCar", () => {
    it("should call status 201 and data userCar", async () => {
      const rentStartedAt = new Date().toISOString()
      const rentEndedAt = dayjs(rentStartedAt).add(1, 'day')

      const mockRequest = {
        body: {
          rentStartedAt,
          rentEndedAt: null
        },
        params: {
          id: 1
        },
        user: {
          id: 1
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockNext = jest.fn()
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(mockCar)
      }

      const mockUserCarModel = {
        findOne: jest.fn().mockReturnValue(null),
        create: jest.fn().mockReturnValue({
          ...mockUserCar,
          rentStartedAt,
          rentEndedAt
        })
      }
      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs
      })

      await carController.handleRentCar(mockRequest, mockResponse, mockNext)

      expect(mockUserCarModel.create).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(201)
      expect(mockResponse.json).toHaveBeenCalledWith({
        ...mockUserCar,
        rentStartedAt,
        rentEndedAt
      })
    })
    it("should call status 422 and err if car already rented", async () => {
      const rentStartedAt = new Date().toISOString()
      const mockRequest = {
        body: {
          rentStartedAt,
          rentEndedAt: null
        },
        params: {
          id: 1
        },
        user: {
          id: 1
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockNext = jest.fn()
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(mockCar)
      }
      const mockUserCarModel = {
        findOne: jest.fn().mockReturnValue(true)
      }
      const controller = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs
      })

      await controller.handleRentCar(mockRequest, mockResponse, mockNext)
      const err = new CarAlreadyRentedError(mockCar)

      expect(mockResponse.status).toHaveBeenCalledWith(422)
      expect(mockResponse.json).toHaveBeenCalledWith(err)
    })
    it("should be called err", async () => {
      const rentStartedAt = new Date().toISOString()
      const mockRequest = {
        body: {
          rentStartedAt,
          rentEndedAt: null
        },
        params: {
          id: 1
        },
        user: {
          id: 1
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const mockNext = jest.fn()
      const mockCarModel = {
        create: jest.fn().mockReturnValue(new Error())
      }

      const mockUserCarModel = {}
      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: mockUserCarModel,
        dayjs
      })

      await carController.handleRentCar(mockRequest, mockResponse, mockNext)

      expect(mockNext).toHaveBeenCalled()
    })
  })

  describe("#handleUpdateCar", () => {
    it("should call status 200 and data car", async () => {
      const mockCarRequest = {
        name: mockCar.name,
        price: mockCar.price,
        size: mockCar.size,
        image: mockCar.image,
        isCurrentlyRented: mockCar.isCurrentlyRented
      }
      const mockRequest = {
        body: mockCarRequest,
        params: {
          id: 1
        }
      }

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(mockCar),
        update: jest.fn().mockReturnThis()
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleUpdateCar(mockRequest, mockResponse)

      expect(mockCarModel.findByPk).toHaveBeenCalled()
      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockCarModel.update).toHaveBeenCalledWith(mockCarRequest, { where: { id: mockRequest.params.id } })
    })

    it("should call status 422 and err json", async () => {
      const mockCarRequest = {
        name: mockCar.name,
        price: mockCar.price,
        size: mockCar.size,
        image: mockCar.image,
        isCurrentlyRented: mockCar.isCurrentlyRented
      }
      const mockRequest = {
        body: mockCarRequest,
        params: {
          id: 1
        }
      }

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const err = new Error('error')
      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(mockCar),
        update: jest.fn().mockRejectedValue(err)
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleUpdateCar(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(422)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message
        }
      })
    })
  })

  describe("#handleDeleteCar", () => {
    it("should call status 204 if data delete", async () => {
      const mockRequest = {
        params: {
          id: 1
        }
      }
      const mockResponse = {
        status: jest.fn().mockReturnValue({
          end: jest.fn()
        })

      }

      const mockCarModel = {
        destroy: jest.fn().mockReturnThis()
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      await carController.handleDeleteCar(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(204)
    })
  })

  describe("#getCarFromRequest", () => {
    it("should return car data from id", () => {
      const mockCarRequest = {
        params: {
          id: 1
        }
      }

      const mockCarModel = {
        findByPk: jest.fn().mockReturnValue(mockCar)
      }

      const carController = new CarController({
        carModel: mockCarModel,
        userCarModel: {},
        dayjs
      })

      const car = carController.getCarFromRequest(mockCarRequest)

      expect(car).toEqual(mockCar)
    })
  })

  describe("#getListQueryFromRequest", () => {
    it("should return query object", () => {
      const availableAt = new Date().toISOString()
      const mockRequest = {
        query: {
          size: 2,
          availableAt
        }
      }

      const carController = new CarController({
        carModel: {},
        userCarModel: {},
        dayjs
      })

      const query = carController.getListQueryFromRequest(mockRequest)

      expect(query).toEqual({
        include: {
          model: {},
          as: 'userCar',
          required: false,
          where: {
            rentEndedAt: {
              [Op.gte]: availableAt
            }
          }
        },
        where: {
          size: 2
        },
        limit: 10,
        offset: carController.getOffsetFromRequest(mockRequest),
      });
    })
  })
})
