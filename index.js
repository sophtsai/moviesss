const portNumber = 3000;
const path = require("path");
const express = require("express");
const app = express();
app.set("views", path.resolve(__dirname, "views/templates"));
app.set("view engine", "ejs");
app.use(express.static("public"));
const bodyParser = require("body-parser");
app.use(bodyParser.urlencoded({ extended: true }));

require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

function populateMovies(email, movieList) {
  let displayMovies = `<div class="listContainer">`;

  movieList.forEach((movie) => {
    let moviePoster = getImage(movie);
    // "https://image.tmdb.org/t/p/w500" + movie.poster_path;
    displayMovies += `<div class="movieCard"><a href="/reviewForm?email=${email}&title=${movie.title}"><img src="${moviePoster}"/><p>${movie.title}</p></a></div>`;
  });

  return (displayMovies += "</div>");
}

function populateReviews(reviewList) {
  let displayReviews = `<div class="listContainer">`;

  reviewList.forEach((review) => {
    displayReviews += `<div class="reviewCard"><img src="${review.movieImage}"/><div class="reviewInfo"><h3><b>${review.movieTitle}</b></h3><div><b>Date Reviewed: </b>${review.reviewDate}</div><div class="reviewTitle"><b>Review:</b></div><div>${review.review}</div></div></div>`;
  });

  return (displayReviews += "</div>");
}

function populateReviews(reviewList) {
  let displayReviews = `<div class="listContainer">`;

  reviewList.forEach((review) => {
    displayReviews += `<div class="reviewCard"><img src="${review.movieImage}"/><div class="reviewInfo"><h3><b>${review.movieTitle}</b></h3><div><b>Date Reviewed: </b>${review.reviewDate}</div><div class="reviewTitle"><b>Review:</b></div><div>${review.review}</div></div></div>`;
  });

  return (displayReviews += "</div>");
}

// gets image using the first result found by getMoveByName and accessing the poster_path. Returns src link.
function getImage(movie) {
  let path = movie.poster_path;
  return `https://image.tmdb.org/t/p/w500/${path}`;
}

/********** MONGODB functions **********/
const uri = process.env.MONGO_DB_URI;
const databaseAndCollection = {
  db: process.env.MONGO_DB_NAME,
  collection: process.env.MONGO_COLLECTION,
};
const { MongoClient, ServerApiVersion } = require("mongodb");
const client = new MongoClient(uri, {
  serverApi: ServerApiVersion.v1,
});
const database = client.db(databaseAndCollection.db);
const users = database.collection(databaseAndCollection.collection);

// Retrieve user data by email
async function getUser(email) {
  try {
    await client.connect();

    const result = await users.findOne({ email: email });
    return result;
  } catch (e) {
    return undefined;
  } finally {
  }
}

/********** TMDB API functions **********/
const options = {
  method: "GET",
  headers: {
    accept: "application/json",
    Authorization: `Bearer ${process.env.TMDB_API_KEY}`,
  },
};

// get list of popular movies
async function getPopularMovies() {
  try {
    const result = await fetch(
      "https://api.themoviedb.org/3/movie/popular?language=en-US&page=1",
      options
    );
    const json = await result.json();
    return json.results;
  } catch (e) {
    console.error(e);
  }
}

// get list of now playing movies
async function getNowPlayingMovies() {
  try {
    const result = await fetch(
      "https://api.themoviedb.org/3/movie/now_playing?language=en-US&page=1",
      options
    );
    const json = await result.json();
    return json.results;
  } catch (e) {
    console.error(e);
  }
}

// get list of top rated movies
async function getTopRatedMovies() {
  try {
    const result = await fetch(
      "https://api.themoviedb.org/3/movie/top_rated?language=en-US&page=1",
      options
    );
    const json = await result.json();
    return json.results;
  } catch (e) {
    console.error(e);
  }
}

// gets the movie json given the name and returns the first result.
async function getMovieByName(name) {
  let q = name.toString().replaceAll(" ", "%20"); //deal with spaces
  const results = await fetch(
    `https://api.themoviedb.org/3/search/movie?query=${q}&include_adult=false&language=en-US&page=1`,
    options
  );
  const json = await results.json();
  return json.results[0];
}

/********** Express Routes **********/

// Displays Landing Page
app.get("/", (request, response) => {
  response.render("index");
});

// Displays Login Page
app.get("/login", async (request, response) => {
  const invalidLogin = request.query?.invalidLogin === "true";
  response.render("login", { invalidLogin });
});

// Displays Signup Page
app.get("/signup", (request, response) => {
  const invalidSignup = request.query?.invalidSignup === "true";
  response.render("signup", { invalidSignup });
});

// Handles Sign Up form from signup page
app.post("/signup", async (request, response) => {
  const { email } = request.body;
  const newUser = {
    email: email,
    reviews: [],
  };
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
  });
  try {
    const find = await users.findOne({ email: email });
    if (find === null) {
      // add new user
      await users.insertOne(newUser);
      response.redirect(`/movies?email=${email}`);
    } else {
      // user already exists, throw alert
      response.redirect(`/signup?invalidSignup=${true}`);
    }
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
  }
});

// displaying popular, now playing, and top rated movies
app.get("/movies", async (request, response) => {
  let email = request.query.email;
  if (!email) {
    response.redirect("/");
  }
  const user = await getUser(email);
  if (!user) {
    // User does not exist, redirect back to login and throw alert
    response.redirect("/login?invalidLogin=true");
  }
  let urlEmail = "?email=" + email;

  let popularList = await getPopularMovies();
  let popularMovies = populateMovies(email, popularList);

  let nowPlayingList = await getNowPlayingMovies();
  let nowPlayingMovies = populateMovies(email, nowPlayingList);

  let topRatedList = await getTopRatedMovies();
  let topRatedMovies = populateMovies(email, topRatedList);

  let variables = {
    popularMovies: popularMovies,
    playingMovies: nowPlayingMovies,
    topRatedMovies: topRatedMovies,
    email: urlEmail,
  };
  response.render("movies", variables);
});

// displaying user's reviews
app.get("/myReviews", async (request, response) => {
  let email = request.query.email;
  if (!email) {
    response.redirect("/");
  }
  let urlEmail = "?email=" + email;

  let userData = await getUser(email);

  let reviewList = populateReviews(userData.reviews);

  let variables = {
    reviewList: reviewList,
    email: urlEmail,
  };
  response.render("myReviews", variables);
});

// displaying auto-filled information of selected movie in review form
app.get("/reviewForm", async (request, response) => {
  let { title, email } = request.query;
  let movie = await getMovieByName(title); // returns json object of movie

  let variables = {
    image: getImage(movie),
    movieTitle: movie.title,
    releaseDate: new Date(movie.release_date).toLocaleDateString(),
    desc: movie.overview,
    email,
  };
  response.render("reviewForm", variables);
});

// send review to backend
app.post("/reviewForm", (request, response) => {
  let movie = request.query.movieTitle; // retrieve movie title from form data

  // TODO: add review to user
  /* Implement here */

  response.render("reviewConfirmation", { movieTitle: movie });
});

console.log(`Web server started and running at http://localhost:${portNumber}`);
app.listen(portNumber);
