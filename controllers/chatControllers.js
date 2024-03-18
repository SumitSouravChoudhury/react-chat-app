const { Chat, User } = require("../models");

const accessChat = async (req, res) => {
  const { userId } = req.body;

  if (!userId) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "UserId param not sent with request",
    });
  }

  let chatExists = await Chat.find({
    isGroupChat: false, 
    $and: [
      { users: { $elemMatch: { $eq: req.user._id } } },
      { users: { $elemMatch: { $eq: userId } } },
    ],
  })
    .populate("users", "-password")
    .populate("latestMessage");

  chatExists = await User.populate(chatExists, {
    path: "latestMessage.sender",
    select: "name pic email", 
  });

  if (chatExists.length > 0) {
    return res.status(200).send(chatExists[0]);
  } else {
    let newChatData = {
      chatName: "sender",
      isGroupChat: false,
      users: [req.user._id, userId],
    };

    try {
      const createdChat = await Chat.create(newChatData);
      const FullChat = await Chat.findOne({ _id: createdChat._id }).populate(
        "users",
        "-password"
      );
      res.status(200).json(FullChat);
    } catch (error) {
      res.status(400).json({
        success: false,
        statusCode: 400,
        message: error.message,
      });
    }
  }
};

const fetchChats = async (req, res) => {
  try {
    let results = await Chat.find({
      users: { $elemMatch: { $eq: req.user._id } },
    })
      .populate("users", "-password")
      .populate("groupAdmin", "-password")
      .populate("latestMessage")
      .sort({ updatedAt: -1 })
      .exec();

    results = await User.populate(results, {
      path: "latestMessage.sender",
      select: "name pic email",
    });

    return res.status(200).send(results);
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message,
    });
  }
};

const createGroupChat = async (req, res) => {

  if (!req.body.users || !req.body.name) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "Please Fill all the feilds",
    });
  }

  let users = JSON.parse(req.body.users);

  if (users.length < 2) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: "More than 2 users are required to form a group chat",
    });
  }

  if (!users.includes(req.user._id.toString())) {
    users.push(req.user); 
  }

  try {
    const groupChat = await Chat.create({
      chatName: req.body.name,
      users,
      isGroupChat: true,
      groupAdmin: req.user, 
    });

    const fullGroupChat = await Chat.findOne({ _id: groupChat._id })
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    return res.status(200).json(fullGroupChat);
  } catch (error) {
    return res.status(400).json({
      success: false,
      statusCode: 400,
      message: error.message,
    });
  }
};

const renameGroup = async (req, res) => {
  const { chatId, chatName } = req.body;

  const isAdmin = await Chat.findOne({ groupAdmin: req.user._id }).exec();
  if (!isAdmin) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "You are not authorized",
    });
  }

  try {
    const updatedChat = await Chat.findByIdAndUpdate(
      chatId,
      {
        chatName: chatName,
      },
      {
        new: true,
      }
    )
      .populate("users", "-password")
      .populate("groupAdmin", "-password");

    if (!updatedChat) {
      return res.status(404).json({
        success: false,
        statusCode: 404,
        message: "Chat Not Found",
      });
    } else {
      return res.status(200).json(updatedChat);
    }
  } catch (error) {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      message: error.message,
    });
  }
};

const addToGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  const isAdmin = await Chat.findOne({ groupAdmin: req.user._id }).exec();
  if (!isAdmin) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "You are not authorized",
    });
  }

  const added = await Chat.findByIdAndUpdate(
    chatId,
    {
      $push: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!added) {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      message: "Chat Not Found",
    });
  } else {
    return res.status(200).json(added);
  }
};


const removeFromGroup = async (req, res) => {
  const { chatId, userId } = req.body;

  const isAdmin = await Chat.findOne({ groupAdmin: req.user._id }).exec();
  if (!isAdmin) {
    return res.status(401).json({
      success: false,
      statusCode: 401,
      message: "You are not authorized",
    });
  }

  const removed = await Chat.findByIdAndUpdate(
    chatId,
    {
      $pull: { users: userId },
    },
    {
      new: true,
    }
  )
    .populate("users", "-password")
    .populate("groupAdmin", "-password");

  if (!removed) {
    return res.status(404).json({
      success: false,
      statusCode: 404,
      message: "Chat Not Found",
    });
  } else {
    return res.status(200).json(removed);
  }
};

module.exports = {
  accessChat,
  fetchChats,
  createGroupChat,
  renameGroup,
  addToGroup,
  removeFromGroup,
};
