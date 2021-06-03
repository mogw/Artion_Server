require("dotenv").config();
const fs = require("fs");
const formidable = require("formidable");
const router = require("express").Router();
const mongoose = require("mongoose");
const Bundle = mongoose.model("Bundle");
const Account = mongoose.model("Account");

const jwt = require("jsonwebtoken");
const jwt_secret = process.env.JWT_SECRET;

const auth = require("./middleware/auth");

const pinataSDK = require("@pinata/sdk");

const toLowerCase = require("../utils/utils");

const extractAddress = (req, res) => {
  let authorization = req.headers.authorization.split(" ")[1],
    decoded;
  try {
    decoded = jwt.verify(authorization, jwt_secret);
  } catch (e) {
    return res.status(401).send("unauthorized");
  }
  let address = decoded.data;
  address = toLowerCase(address);
  return address;
};

const ipfsUri = "https://gateway.pinata.cloud/ipfs/";

const uploadPath = process.env.UPLOAD_PATH;
const pinata = pinataSDK(
  process.env.PINATA_API_KEY,
  process.env.PINATA_SECRET_API_KEY
);

// pin image file for NFT creation
const pinFileToIPFS = async (fileName, address, name, symbol) => {
  const options = {
    pinataMetadata: {
      name: name,
      keyvalues: {
        address: address,
        symbol: symbol,
      },
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  const readableStreamForFile = fs.createReadStream(uploadPath + fileName);

  try {
    let result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin file to ipfs";
  }
};

// pin image for bundle
const pinBundleFileToIPFS = async (fileName, name, address) => {
  const options = {
    pinataMetadata: {
      name: name,
      keyvalues: {
        bundleName: name,
        address: address,
      },
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  const readableStreamForFile = fs.createReadStream(uploadPath + fileName);

  try {
    let result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin file to ipfs";
  }
};

// pin banner image
const pinBannerFileToIPFS = async (fileName, address) => {
  const options = {
    pinataMetadata: {
      name: address,
      keyvalues: {},
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  const readableStreamForFile = fs.createReadStream(uploadPath + fileName);

  try {
    let result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin file to ipfs";
  }
};

// pin image for collection
const pinCollectionFileToIPFS = async (fileName, name, address) => {
  const options = {
    pinataMetadata: {
      name: name,
      keyvalues: {
        bundleName: name,
        address: address,
      },
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };
  const readableStreamForFile = fs.createReadStream(uploadPath + fileName);

  try {
    let result = await pinata.pinFileToIPFS(readableStreamForFile, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin file to ipfs";
  }
};
// pin json to ipfs for NFT
const pinJsonToIPFS = async (jsonMetadata) => {
  const options = {
    pinataMetadata: {
      name: jsonMetadata.name,
      keyvalues: {
        address: jsonMetadata.properties.address,
      },
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };

  try {
    let result = await pinata.pinJSONToIPFS(jsonMetadata, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin json to ipfs";
  }
};
// pin json to ipfs for bundle
const pinBundleJsonToIPFS = async (jsonMetadata) => {
  const options = {
    pinataMetadata: {
      name: jsonMetadata.name,
      keyvalues: {
        bundleName: jsonMetadata.name,
      },
    },
    pinataOptions: {
      cidVersion: 0,
    },
  };

  try {
    let result = await pinata.pinJSONToIPFS(jsonMetadata, options);
    return result;
  } catch (error) {
    console.log(error);
    return "failed to pin json to ipfs";
  }
};

router.get("/ipfstest", async (req, res) => {
  pinata
    .testAuthentication()
    .then((result) => {
      console.log(result);
      res.send({
        result: result,
      });
    })
    .catch((err) => {
      console.log(err);
      res.send({
        result: "failed",
      });
    });
});
router.get("/test", auth, async (req, res) => {
  return res.json({
    apistatus: "running",
  });
});

router.post("/uploadImage2Server", auth, async (req, res) => {
  let form = new formidable.IncomingForm({
    maxFileSize: 200 * 1024 * 1024,
    maxFieldsSize: 300 * 1024 * 1024,
  });
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.log("form parse failed");
      console.log(err);
      return res.status(400).json({
        status: "failed",
      });
    } else {
      let imgData = fields.image;
      let name = fields.name;
      // let address = fields.account;
      // address = toLowerCase(address);

      /* change getting address from auth token */
      let address = extractAddress(req, res);

      let description = fields.description;
      let symbol = fields.symbol;
      let extension = imgData.substring(
        "data:image/".length,
        imgData.indexOf(";base64")
      );
      let imageFileName =
        address + name.replace(" ", "") + symbol + "." + extension;
      imgData = imgData.replace(`data:image\/${extension};base64,`, "");
      fs.writeFile(uploadPath + imageFileName, imgData, "base64", (err) => {
        if (err) {
          console.log("save image failed");
          console.log(err);
          return res.status(400).json({
            status: "failed to save an image file",
            err,
          });
        }
      });
      let filePinStatus = await pinFileToIPFS(
        imageFileName,
        address,
        name,
        symbol
      );
      console.log(filePinStatus);

      // remove file once pinned
      try {
        fs.unlinkSync(uploadPath + imageFileName);
      } catch (error) {
        console.log("failed to unlink");
        console.log(error);
      }

      let now = new Date();
      let currentTime = now.toTimeString();

      let metaData = {
        name: name,
        image: ipfsUri + filePinStatus.IpfsHash,
        description: description,
        properties: {
          symbol: symbol,
          address: address,
          createdAt: currentTime,
          collection: "Fantom Powered Artion Collection",
        },
      };

      let jsonPinStatus = await pinJsonToIPFS(metaData);
      console.log(jsonPinStatus);
      return res.send({
        status: "success",
        uploadedCounts: 2,
        fileHash: ipfsUri + filePinStatus.IpfsHash,
        jsonHash: ipfsUri + jsonPinStatus.IpfsHash,
      });
    }
  });
});

router.post("/uploadBundleImage2Server", auth, async (req, res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        status: "failedParsingForm",
      });
    } else {
      let imgData = fields.imgData;
      let name = fields.name;
      let description = fields.description;
      let address = fields.address;
      address = toLowerCase(address);
      let extension = imgData.substring(
        "data:image/".length,
        imgData.indexOf(";base64")
      );
      let imageFileName = address + name.replace(" ", "") + "." + extension;
      imgData = imgData.replace(`data:image\/${extension};base64,`, "");
      await fs.writeFile(
        uploadPath + imageFileName,
        imgData,
        "base64",
        (err) => {
          if (err) {
            return res.status(400).json({
              status: "failed to save an image file",
              err,
            });
          }
        }
      );

      let filePinStatus = await pinBundleFileToIPFS(
        imageFileName,
        name,
        address
      );
      // remove file once pinned
      try {
        fs.unlinkSync(uploadPath + imageFileName);
      } catch (error) {}

      let bundle = new Bundle();
      bundle.bundleName = name;
      bundle.description = description;
      bundle.imageHash = ipfsUri + filePinStatus.IpfsHash;
      bundle.address = address;

      try {
        let saveStatus = await bundle.save();
        if (saveStatus) {
          return res.send({
            status: "success",
            bundle: saveStatus,
          });
        } else {
          return res.status(400).json({
            status: "failedSavingToDB",
          });
        }
      } catch (error) {
        console.log(error);
        return res.status(400).json({
          status: "failedOutSave",
        });
      }
    }
  });
});

const generateRandomName = () => {
  return (
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15)
  );
};
// pin banner image
router.post("/uploadBannerImage2Server", auth, async (req, res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        status: "failedParsingForm",
      });
    } else {
      let imgData = fields.imgData;
      // let address = fields.address;
      // address = toLowerCase(address);

      /* change getting address from auth token */
      let address = extractAddress(req, res);
      let name = generateRandomName();

      let extension = imgData.substring(
        "data:image/".length,
        imgData.indexOf(";base64")
      );
      let imageFileName = address + name.replace(" ", "") + "." + extension;
      imgData = imgData.replace(`data:image\/${extension};base64,`, "");
      fs.writeFile(uploadPath + imageFileName, imgData, "base64", (err) => {
        if (err) {
          return res.status(400).json({
            status: "failed to save an image file",
            err,
          });
        }
      });

      let filePinStatus = await pinBannerFileToIPFS(imageFileName, address);
      // remove file once pinned

      try {
        let account = await Account.findOne({
          address: address,
        });
        if (account) {
          account.bannerHash = ipfsUri + filePinStatus.IpfsHash;
          await account.save();
        }
      } catch (error) {}
      try {
        fs.unlinkSync(uploadPath + imageFileName);
      } catch (error) {}
      return res.json({
        status: "success",
        data: filePinStatus.IpfsHash,
      });
    }
  });
});

// pin collection image
router.post("/uploadCollectionImage2Server", auth, async (req, res) => {
  let form = new formidable.IncomingForm();
  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(400).json({
        status: "failedParsingForm",
      });
    } else {
      let imgData = fields.imgData;
      let name = fields.collectionName;
      // let address = fields.erc721Address;
      // address = toLowerCase(address);

      // change getting address from auth token
      let address = extractAddress(req, res);

      let extension = imgData.substring(
        "data:image/".length,
        imgData.indexOf(";base64")
      );
      let imageFileName = address + name.replace(" ", "") + "." + extension;
      imgData = imgData.replace(`data:image\/${extension};base64,`, "");
      fs.writeFile(uploadPath + imageFileName, imgData, "base64", (err) => {
        if (err) {
          return res.status(400).json({
            status: "failed to save an image file",
            err,
          });
        }
      });

      let filePinStatus = await pinCollectionFileToIPFS(
        imageFileName,
        name,
        address
      );
      // remove file once pinned
      try {
        fs.unlinkSync(uploadPath + imageFileName);
      } catch (error) {}
      return res.json({
        status: "success",
        data: filePinStatus.IpfsHash,
      });
    }
  });
});

module.exports = router;
