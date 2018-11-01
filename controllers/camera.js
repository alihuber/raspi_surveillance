const { exec } = require("child_process");

const activateCmd = "motion -c /home/pi/motion.conf";
const timestampCmd = "node -e 'console.log(Date.now())' > /home/pi/motion/stamp.txt";
const deactivateCmd = "killall motion";
const removeCmd = "rm /home/pi/motion/*.jpg";

module.exports.activate = (req, res) => {
  if (req.authenticated) {
    exec(activateCmd, () => {
      console.log("activated motion!");
    });
    exec(timestampCmd, () => {
      console.log("made timestamp");
    });
    setTimeout(
      () => {
        res.redirect("back");
      },
      3000,
      res,
    );
  } else {
    res.status(401).send();
  }
};

module.exports.deactivate = (req, res) => {
  exec(deactivateCmd, () => {
    console.log("deactivated motion!");
  });
  exec(removeCmd, () => {
    console.log("removed jpg files!");
  });
  res.redirect("back");
};
