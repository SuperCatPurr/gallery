const express = require('express');
const session = require('express-session');
const alert = require('alert'); 
let app = express();
app.use(express.json());
app.use(express.urlencoded({extended: false}));
app.set("view engine", "pug");
app.use(express.static("public"));

//Database variables
let mongo = require('mongodb');
let mc = mongo.MongoClient;
let db;


//Setting up the express sessions to be stored in the database.
app.use(session(
  { 
    secret: 'top secret key',
    resave: true,
    saveUninitialized: false,
  })
);


//global variables to store current data
let user = {};
user.likes=[{}];
user.reviews = [{}];
user.follow = [{}];
user.notification = [{}];
let category = [""];
let medium = [""];
let artworksSet = [{}];
let artwork = {};
artwork.likes = 0;
artwork.reviews = [{}];
let artist = {};
artist.artworks = [{}];
let totalUsers = 0;
let workshop;
notification = [{}];

//routers
app.get(['/', '/home'], (req,res,next)=>{res.render("pages/index");});
app.get("/register",(req,res,next)=>{res.render("pages/register")});
app.get("/logout",logout);
app.get("/users/:uID", auth,retrieveLikes,retrieveReviews,renderUserPage); //auth restrict the user to get own profile page
app.get("/artworks/:aID", getArtwork,getRevAndLikes,getArtistByName,getSameCat,getSameMd,renderArtwork);
app.get("/artworks", sendArtworkSet); 
app.get("/addArtwork", sendAddArtwork); 
app.get("/addWorkshop", sendAddWorkshop); 
app.get("/workshops/:wID", renderWorkshop); 
app.get("/artists/:artistID", getArtistByID,getArtworkByArtist,getWorkshop,renderArtist); 


app.post("/login",getUserByName,retrieveLikes,retrieveReviews,login,renderUserPage);
app.post("/register",checkUserName,countUsers,addUser,login,renderUserPage);
app.post("/addArtwork",verifyArtwork,addArtwork);
app.post("/addWorkshop",addWorkshop);
app.post("/artists/:aID", followArtist);
app.post("/artwork/:aID", updateRevAndLike);
app.post("/workshops/:wID", enrollWorkshop);


// Initialize database connection
mc.connect("mongodb://127.0.0.1:27017/", { useNewUrlParser: true }, function(err, client) {
  if(err) throw err;

  db = client.db('a5');
	console.log("connected to the a5 database");

  //get all categories of artworks
  db.collection("artworks").distinct("category",{},(err,ctgry)=>{
    if(err) throw err;
    if(ctgry){
      category = ctgry;
    }
  }) 

   //get all mediums of artworks
   db.collection("artworks").distinct("medium",{},(err,md)=>{
    if(err) throw err;
    if(md){
      medium = md;
    }
  })

  app.listen(3000);
  console.log("server running at: http://localhost:3000/");
});


//authorization function
function auth(req, res, next) {
	if (!req.session.loggedin || Number(req.params.uID) !== user.id) {
		res.status(401).send("Unauthorized");
		return;
	}
	next();
}

//login function from tut9 demo
function login(req,res,next){
  if(req.session.loggedin != true){ //make sure only one user can log in within a single browers
    req.session.loggedin = true;
    req.session.username = user.username;
    req.session.userID = user.id;
    console.log(req.session.id + "--" + req.session.username + " logging in...")
    next();
  }else{
    res.status(401).send("Sorry, browser occupied by another user"); //deny login request if the browser already serve for a user
		return;
  }
}

//logout function from tut9 demo
function logout(req, res, next) {
	if (req.session.loggedin) {
		req.session.loggedin = false;
		req.session.username = undefined;
    req.session.userID = undefined;
		console.log("Logged out.");
    res.redirect(`http://localhost:3000/home`);
	} else{
    res.status(200).send("You cannot log out because you aren't logged in.");
  }
	
}

//count the number of users
function countUsers(req,res,next){
  db.collection("users").countDocuments({},function(err,total){
    if(err) throw err;
    totalUsers = total;
    next();
  });
}

//get user by given name in the database
function getUserByName(req,res,next){
  user = {}//clear previous user data]
  let name = req.body.username;
  let password = req.body.password;
  db.collection("users").findOne(({"username":name}),function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };

    if(!result){
			res.status(404).send("Sorry, you're not registered");
			return;
		};

    if(result.password !== password){
      res.status(404).send("password error");
			return;
    }

    user.username = result.username;
    user.id = result.id;
    user.isArtist = result.isArtist;
    user.follow = result.follow;

    //add notification if there is new workshop or artwork added by the artist followed by the user
    //filter the notification so only followed artist's new info appear in current user's profile page
    if(user.follow !== undefined){
      user.follow.forEach(a=>{
        if(a.name !== undefined){
          if(notification.filter(n=>n.artist===a.name).length>0){
            if(user.notification !== undefined)
              user.notification.concat(notification.filter(n=>n.artist===a.name));
            else user.notification = notification.filter(n=>n.artist===a.name);
          }          
        }
      }); 
    }
    console.log(result.username + "'s profile found; isArtist: " + user.isArtist );
    next()
  });
}

function checkUserName(req,res,next){
  user = {}//clear previous user data]
  let name = req.body.username;
  db.collection("users").findOne(({"username":name}),function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };

    if(!result) next();
    else{
      res.status(400).send("Duplicate name");
			return;
    }
  });
}

//add user to the database
function addUser(req,res,next){

  //create new user
  user = {}//clear previous user data]
  user.username = req.body.username;
  user.id = totalUsers;
  user.password = req.body.password;
  user.isArtist = false;
  user.likes=[{}];
  user.reviews = [{}];
  user.follow = [{}];

  //add user to database
  console.log("pass validation...create new account");
  db.collection("users").insertOne(user,function(err,res){
    if(err){
      res.status(500).send("Error saving to database.");
      return;
    }

    console.log(res);
    next();
  });
}

//get artworks liked and reviewed by the user
function retrieveLikes(req,res,next){
  db.collection("reviews").find({"reviewer":user.username, "like":true}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    user.likes = result;
    next();
  });
}

function retrieveReviews(req,res,next){
  db.collection("reviews").find({"reviewer":user.username, "hasReview":true}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    user.reviews = result;
    next();
  });  
}



//redirect page to user's profile page
function renderUserPage(req,res,next){
  console.log("rendering " + user.username + "'s page");
  res.status(200).render("pages/user", {user:user, category:category,session:req.session});
}

//get artwork from database by given id
function getArtwork(req,res,next){
  let aid = Number(req.params.aID);
  db.collection("artworks").findOne(({"id":aid}),function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };

    if(!result){
			res.status(404).send("Oops..Unknown ID");
			return;
		};
    artwork = result;

    next();
  });
}

//get reviews and number of likes in database
function getRevAndLikes(req,res,next){
  let aid = Number(req.params.aID);
  //get reviews
  db.collection("reviews").find({"artworkID":aid, "hasReview":true}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    artwork.reviews = result;
    console.log(artwork.reviews);
    //get number of likes
    db.collection("reviews").countDocuments({"artworkID":aid, "like":true},function(err,res){
      if(err) throw err;
      artwork.likes = res;
      next();
    })   
  });

}

//get the artist from database by given name
function getArtistByName(req,res,next){
  let name = artwork.artist;
  db.collection("users").findOne({"username":name},function(err,res){
    if(err) throw err;
    artist.name = res.username;
    artist.id = res.id;
    console.log(res);
    console.log("artist's user id: " + artist.id);
    next();
  })
}


//get artworks in same category
function getSameCat(req,res,next){
  db.collection("artworks").find({"category":artwork.category}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    artwork.sameCat = result;
    next();
  });
}

//get artworks in same medium
function getSameMd(req,res,next){
  db.collection("artworks").find({"medium":artwork.medium}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    artwork.sameMd = result;
    next();
  });
}

//render artwork page
function renderArtwork(req,res,next){
  res.status(200).render("pages/artwork", {artwork: artwork,user:user, artist:artist,session:req.session});
}

//send search results of artworks to the user 
function sendArtworkSet(req,res,next){
  db.collection("artworks").find({"category":req.query.category, 
  "name":{$regex: req.query.name},
  "artist":{$regex: req.query.artist},
}).toArray(function(err,result){  
  if(err) throw err;
  artworksSet = result;
  res.status(200).render("pages/user", {user:user, category:category,artworks:artworksSet,session:req.session});
  }); 
}

//send add Artwork page to user
function sendAddArtwork(req,res,next){
  res.status(200).render("pages/addArtwork", {category:category, medium:medium, user:user, session:req.session});
}


function sendAddWorkshop(req,res,next){
  if(user.isArtist) res.status(200).render("pages/addWorkshop", {user:user,session:req.session});
  else res.status(401).send("Unauthorized");
}


//validate the artwork user submitted
function verifyArtwork(req,res,next){
  artwork = {};
  artwork.name = req.body.name;
  artwork.artist = user.username;
  artwork.year = req.body.year;
  artwork.category = req.body.category;
  artwork.medium = req.body.medium;
  artwork.description = req.body.description;
  artwork.image = req.body.image;
  
  let isValid = true;
  //validation of fields
  (Object.keys(artwork)).forEach(field => {
    if(artwork[field].length === 0)
      isValid = false;
  }); 
  artwork.year = Number(req.body.year);
  if(isNaN(artwork.year)) isValid = false;

  // validation of duplication artwork 
  if(isValid){
    console.log();
    (db.collection("artworks").countDocuments({"name":artwork["name"]},function(err,count){
      if(err) throw err;
      if(count>0){
        isValid = false;
        res.status(400).send("Fail! Duplicate artwork");
      }
      else{
        //add id to the artwork
        db.collection("artworks").countDocuments({},function(err,total){
          artwork.id = total;
          next();
        });
      }
    }))
  }
  else res.status(400).send("Fail! Invalid input");
}

//add artwork to the database
//the user will be artist if not before
function addArtwork(req,res,next){
  //add the artwork to the notification
  notification.push({"artist" : user.username, "type" : "artwork"});

  console.log("Pass validation...add artwork");
  db.collection("artworks").insertOne(artwork, function(err, result){
    if(err){
      res.status(500).send("Error saving to database.");
      return;
    }
    user.isArtist = true;
    console.log(result);
    let newID = artwork.id;
    artwork = {};//clear artwork
    //update user isAritist to true
    db.collection("users").updateOne({"username":user.username},{ $set: {isArtist:true}},{ upsert:false},function(err,result){
      if(err) throw err;
      console.log("user " + user.username + " update file successfully: ");
      //redirect to the artwork page
      res.redirect("http://localhost:3000/artworks/" + newID);
    });

  });
}

//get artist from user collection in the database by given id
//the id is same with artist's user ID
function getArtistByID(req,res,next){
  artist = {}//clear previous data
  let id = Number(req.params.artistID);
  db.collection("users").findOne({"id":id},function(err,res){
    if(err) throw err;
    artist.name = res.username;
    artist.id = res.id;
    console.log(res);
    console.log("artist's user id: " + artist.id);
    next();
  })
}

//get artworks created by the artist
function getArtworkByArtist(req,res,next){
  db.collection("artworks").find({"artist":artist.name}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    artist.artworks = result;
    next();
  });
}

//get workshops of the artist
function getWorkshop(req,res,next){
  db.collection("workshops").find({"artist":artist.name}).toArray(function(err,result){
    if(err){
      res.status(500).send("Error reading database.");
			return;
    };
    artist.workshops = result;
    next();
  });
}

//render artist page
function renderArtist(req,res,next){
  res.status(200).render("pages/artist", {user:user, artist:artist, session:req.session});
}

//add workshop to database
function addWorkshop(req,res,next){
  //add the artwork to the notification
  notification.push({"artist" : user.username, "type" : "workshop"});
  db.collection("workshops").countDocuments({},function(err,wscount){
    if(err) throw err;
    let workshop = {};
    workshop.artist = user.username;
    workshop.name = req.body.name;
    workshop.id = wscount;
    db.collection("workshops").insertOne(workshop,function(err,result){
      if(err){
        res.status(500).send("Error saving to database.");
        return;
      }
      console.log("add workshop to database successfully");     
      console.log(result);
      res.redirect("http://localhost:3000/workshops/" + workshop.id);
    })
  });

}


//get workshop by id from db and render it's page
function renderWorkshop(req,res,next){
  let id = Number(req.params.wID);
  db.collection("workshops").findOne({"id":id},function(err,result){
    if(err) throw err;
    if(!result){
      res.status(404).send("Oops..Unknown ID");
			return;
    }
    workshop = result;
    console.log("rendering workshop... enroll list: " + workshop.followers)
    res.status(200).render("pages/workshop", {user:user,workshop:result, session:req.session});
  })
  
}


//add artist to the follow list if select follow
//otherwise remove artist from list
function followArtist(req,res,next){
  //get select value from request
  let select = req.body.follow;
  let follow = (select === "follow");
  console.log("user want to follow: " + follow);
  let arr = user.follow;

  //if artist exists in user's follow list
  if(user.follow !== undefined && arr.filter(a=>a.name === artist.name).length > 0){
    if(follow){
      res.status(400).send("You have already followed the artist");
      return;
    }else{
      if(!follow){
        newList = arr.filter(a=>a.name !== artist.name);
        user.follow = newList
        db.collection("users").updateOne({"username":user.username},{ $set: {follow:newList}},{ upsert:false},function(err,result){
          if(err) throw err;
          alert("You unfollowed " + artist.name);
          //redirect to the artwork page
          res.redirect("http://localhost:3000/artists/" + artist.id);
        })
      }
    }
  }

  //if artist is not in the list
  else{
    if(follow){
      db.collection("users").updateOne({"username":user.username},{ $push: {"follow":artist}},{ upsert:true},function(err,result){
            if(err) throw err;
            user.follow.push(artist);
            alert("You followed " + artist.name);
            res.redirect("http://localhost:3000/artists/" + artist.id);
          });
    }else{
      res.status(400).send("You did not follow the artist before");
      return;
    }
  }
}


//update current user's review and like of current artwork
function updateRevAndLike(req,res,next){
  //prevent user like/review own artworks
  if(artwork.artist === user.username){
    res.status(400).send("Fail! cannot review/ like your own artwork");
    return;
  }

  //get all the values submitted by current user
  let newRev = req.body.rev;
  let isLike = false;
  let delLike = false;
  let delRev = false;
  isLike = (req.body.like ==="true");
  delLike = (req.body.like === "delLike");
  delRev = (req.body.delRev !== undefined && req.body.delRev === "true");
  console.log("isLike: " + isLike + "----newReview: "+newRev + "----deleteRev: "+delRev);

  //if no change made, then do nothing
  if((artwork.artist === user.username) ||(req.body.like === undefined && req.body.delRev === undefined && req.body.rev ==="")){
    res.status(400).send("Fail! emoty form");
    return;
  }

  //find previos review
  let review = {};
  db.collection("reviews").findOne({"reviewer":user.username, "artworkID": artwork.id},function(err,result){
    review.reviewer = user.username;
    review.reviewerPage = "http://localhost:3000/users/" + user.id;
    review.artworkID = artwork.id;
    review.artwork = "http://localhost:3000/artworks/" + artwork.id;
    

    if(err) throw err;
    if(!result){
      review.like = isLike;
      if(req.body.rev === "") review.hasReview = false;
      else{
        review.hasReview = true;
        review.review = newRev;}  
    }else{
      if(delRev && newRev === "") review.hasReview = false;
      else{
        if(newRev !== ""){
          review.hasReview = true;
          review.review = newRev;  
        }else{
          if(result.review !== undefined) review.review = result.review;
        }
      }
      if(delLike) review.like = false;
      else{
        if(isLike) review.like = true;
        else review.like = result.like;
      }
    }

    //update review
    db.collection("reviews").replaceOne({"reviewer":user.username, "artworkID": artwork.id},review,{ upsert:true},function(err,result){
      if(err) throw err;
      alert("Update successfully");
      res.redirect("http://localhost:3000/artworks/" + artwork.id);
    });
  });

  
   
}

//enroll current users in the current workshop
function enrollWorkshop(req,res,next){
  //check if the user has already enrolled
  if(workshop.followers !== undefined && workshop.followers.includes({"name":user.username})){
    console.log("cannot enroll again");
    res.status(400).send("You have already enrolled");
    return;
  }

  db.collection("workshops").updateOne({"id":workshop.id},{$push:{"followers":{"name":user.username}}},{ upsert:true},function(err,result){
    if(err) throw err;
    console.log("you enroll in " + workshop.name);
    alert("enroll done");
    res.redirect("http://localhost:3000/workshops/" + workshop.id);
  });
}


