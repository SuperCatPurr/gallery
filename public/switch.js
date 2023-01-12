window.addEventListener('load', (event) => {
  document.getElementById("switch").addEventListener("click", toggleProfile);
});

//get user info
let userID = Number(document.getElementById("userID").innerHTML);
let isArtist = false;
if(document.getElementById("isArtist").innerHTML==="true") isArtist = true;

//toggle profile if user is artist 
function toggleProfile(){
  if(isArtist){
    console.log("toggle page");
    if(document.getElementById("artistFunc").style.visibility === "hidden") document.getElementById("artistFunc").style.visibility = "visible"
    else document.getElementById("artistFunc").style.visibility = "hidden";
  }

  //ask non-artist user to add artwork then redirect to profile page and click switch to change profile
  else{
    alert("Sorry, invalid access. Please add an artwork to become an artist");
    window.location = ('http://localhost:3000/addArtwork'); 
  }
  

}