const router = require("express").Router();
const auth = require("./middleware/auth");
const mongoose = require("mongoose");

const Listing = mongoose.model("Listing");

router.post("/getListings", auth, async (req, res) => {
  try {
    let owner = req.body.address;
    let listings = await Listing.find({ owner: owner });
    return res.json({
      status: "success",
      data: listings,
    });
  } catch (error) {
    return res.status(400).json({
      status: "failed",
    });
  }
});

router.post("", auth, async (req, res) => {});
module.exports = router;
