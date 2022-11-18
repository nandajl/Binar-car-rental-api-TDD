/* eslint-disable no-unused-expressions */
const { NotFoundError } = require('../errors')
const ApplicationController = require('./ApplicationController')

describe("ApplicationController", () => {
  describe("#handlegetRoot", () => {
    it("should call res.status(200) and res.json with list of task instances", async () => {
      const mockRequest = {}

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const applicationController = new ApplicationController()
      applicationController.handleGetRoot(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(200)
      expect(mockResponse.json).toHaveBeenCalledWith({
        status: "OK",
        message: "BCR API is up and running!"
      })
    })
  })

  describe("#handleNotFound", () => {
    it("Should return error status 404 and error details", () => {
      const mockRequest = {
        method: "get",
        url: "abc.com"
      }

      const err = new NotFoundError(mockRequest.method, mockRequest.url)

      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }

      const applicationController = new ApplicationController()
      applicationController.handleNotFound(mockRequest, mockResponse)

      expect(mockResponse.status).toHaveBeenCalledWith(404)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
          details: err.details
        }
      })
    })
  })

  describe("#handleError", () => {
    it("should call res.status(500) and res.json with error instance", () => {
      const mockRequest = {
        method: "get",
        url: "abc.com"
      }
      const err = new Error({
        name: "error",
        message: "error bro",
        details: "this err"
      })
      const mockResponse = {
        status: jest.fn().mockReturnThis(),
        json: jest.fn().mockReturnThis()
      }
      const next = jest.fn()

      const applicationController = new ApplicationController()
      applicationController.handleError(err, mockRequest, mockResponse, next)
      expect(mockResponse.status).toHaveBeenCalledWith(500)
      expect(mockResponse.json).toHaveBeenCalledWith({
        error: {
          name: err.name,
          message: err.message,
          details: err.details || null
        }
      })
    })
  })

  describe("#getOffsetFromRequest", () => {
    it("should return offset from request", () => {
      const mockRequest = {
        query: {
          page: 1,
          pageSize: 10
        }
      }

      const applicationController = new ApplicationController()
      const offset = applicationController.getOffsetFromRequest(mockRequest)

      expect(offset).toEqual(0)
    })
  })

  describe('#buildPaginationObject', () => {
    it("should return page, pageCount, pageSize, count", () => {
      const page = 1
      const pageSize = 10
      const count = 20
      const mockRequest = {
        query: {
          page,
          pageSize
        }
      }
      const applicationController = new ApplicationController()
      const returnValue = applicationController.buildPaginationObject(mockRequest, count)
      const pageCount = Math.ceil(count / pageSize)
      expect(returnValue).toEqual({
        count,
        page,
        pageCount,
        pageSize
      })
    })
  })
})
