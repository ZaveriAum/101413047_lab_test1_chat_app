const User = require('../models/User')
// For encryption bcrypt is used
const bcrypt = require('bcrypt')

// find the user from the given email
const findUser = async function (username) {
    // try to return employee after finding using email
    try {
        // .exec() method makes the return a promise. 
        return await User.findOne({ username: username });
    } catch (e) {
        res.status(400).json({message:e.message});
    }
}

// sign up 
const signup = async (req, res) => {
    try{
        // try finding employee from the given email from the body if the empoyee is null then go ahead and create the user or else entered already exists.
        const { username, firstName, lastName, password } = req.body;

        const existing_user = await findUser(username)

        if (existing_user) {
            throw new Error("User already exists with the given username.");
        }

        const hashedPassword = await bcrypt.hash(password, 12);
        const newUser = new User({ username, firstName, lastName, password: hashedPassword });

        await newUser.save();
        res.status(200).json({newUser});
    }catch(e){
        res.status(400).json({message:e.message});
    }
}

// login to the user
const login = async (req, res) => {
    try{
        const { username, password } = req.body;

        const existing_user = await findUser(username);

        if (!existing_user) {
            throw new Error("Invalid username or password");
        }

        const isPasswordCorrect = await bcrypt.compare(password, existing_user.password);
        if (!isPasswordCorrect) {
            throw new Error("Invalid email or password");
        }

        res.status(200).json({existing_user});

    }catch(e){
        res.status(400).json({message:e.message});
    }
}

// exporting functions to user controller
module.exports = {
    signup,
    login
};
