const AuthenticationController = require("./AuthenticationController")

const bcrypt = require("bcryptjs")
const jwt = require("jsonwebtoken")
const { User } = require("../models")
const { Role } = require("../models")

describe("AuthenticationController", () => {
  describe("#createTokenFromUser", () => {
    const role = {
      id: 1,
      name: "member"
    }
    const user = {
      id: 1,
      name: "bochi",
      email: "bochi@mail.com",
      image: "bochi_image",
      role: {
        id: role.id,
        name: role.name
      }
    }
    const authenticationController = new AuthenticationController()
  })
//   describe("#authorize", () => {
//     it("should return req.user", () => {
//       const mockRequest = {
//         headers : {
//             authorization :
//         }
//       }
//       const mockResponse = {}
//       const next = {}
//     })
//   })
})
