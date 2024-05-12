const portNumber = 3000;
const path = require("path");
const express = require("express");
const app = express();
app.set("views", path.resolve(__dirname, "views/templates"));
app.set("view engine", "ejs");
app.use(express.static("public"));

require("dotenv").config({ path: path.resolve(__dirname, "./.env") });

function populateMovies(movieList) {
  let displayMovies = `<div class="listContainer">`;

  movieList.forEach((movie) => {
    let moviePoster = "https://image.tmdb.org/t/p/w500" + movie.poster_path;
    displayMovies += `<div class="movieCard"><img src="${moviePoster}"/><p>${movie.title}</p></div>`;
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

/********** MONGODB functions **********/
const uri = process.env.MONGO_DB_URI;
const databaseAndCollection = {
  db: process.env.MONGO_DB_NAME,
  collection: process.env.MONGO_COLLECTION,
};
const { MongoClient, ServerApiVersion } = require("mongodb");

// Retrieve user data by email
async function getUser(email) {
  const client = new MongoClient(uri, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
    serverApi: ServerApiVersion.v1,
  });
  try {
    await client.connect();

    const result = await client
      .db(databaseAndCollection.db)
      .collection(databaseAndCollection.collection)
      .findOne({ email: email });
    return result;
  } catch (e) {
    console.error(e);
  } finally {
    await client.close();
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

// Get list of popular movies
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

// Get list of now playing movies
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

// Get list of top rated movies
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

app.get("/", (request, response) => {
  response.render("index");
});

app.get("/movies", async (request, response) => {
  let popularList = await getPopularMovies();
  let popularMovies = populateMovies(popularList);

  let nowPlayingList = await getNowPlayingMovies();
  let nowPlayingMovies = populateMovies(nowPlayingList);

  let topRatedList = await getTopRatedMovies();
  let topRatedMovies = populateMovies(topRatedList);

  let variables = {
    popularMovies: popularMovies,
    playingMovies: nowPlayingMovies,
    topRatedMovies: topRatedMovies,
  };
  response.render("movies", variables);
});

app.get("/myreviews", async (request, response) => {
  let userData = await getUser("abc@gmail.com"); // TODO: Replace with logged-in user's email

  let reviewList = populateReviews(userData.reviews);

  let variables = {
    reviewList: reviewList,
  };
  response.render("myReviews", variables);
});

console.log(`Web server started and running at http://localhost:${portNumber}`);
app.listen(portNumber);
