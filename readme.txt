Project: Open Gallery
Date:    2022-12-04

Instructions:
1. run mongodb
  -open new shell, enter mongod in command line (if use default data/db directory)
  -keep the shell running
2. install npm packages
  -open new shell in the directory of project and 
  -enter npm install in command line 
3. initialize database
  -enter node database-initializer.js in command line
  -the database will close when the initialization is done 
4. run server
  -enter node server.js in command line
  -server running at: http://localhost:3000/
5. test
  -to test the existed user who is an artist:
	  Username: Sia
	  Password: abc123
  -to test the new user :
	  Click register

Basic Functionality
(Part A) User
0. login/logout/register
  -only allow 1 user to log in one browser window at a time
  -successful registry will redirect to the new user's page
  -register require different username (case-sensitive)
1. switch between patron and artist, if not artist will ask user to add an artwork to become an artist
2. View and manage artists they follow
  -can jump to artist's page from the link on profile page
  -follow/unfollow user on the artist's page
3. add/update/remove reviews AND like/cancel like of artworks
  -all done on the artwork's page
4. View the list of artworks that they have reviewed/liked on the profile page
5. Notification will display on user's page.
  -Previous existed artworks and workshops will not appear in notification
6. Search artworks
  -the result also displayed in profile page

(Part B) Viewing Artwork
1. see all information/reviews/likes
2. artist'name contains link to artist's page
3. see artworks of same category/medium
4. add/update/remove reviews AND like/cancel like of artworks

(Part C) Viewing Artist Profiles
1. See all the artworks created by the artist, the artwork name contains a link of its page
2. See all the workshops hosted by the artist and enroll in a workshop,
  -user will get alert if enroll successfully
3. Allow user to see the list of enrolled users of the workshop
4. Follow/unfollow artist and receive notification of followed artist (need to be fixed)

(Part D) Artists
1. add artwork
  -the name must be unique (case-sensitive)
2. add workshop by specifying title

Overall Design & Critique
Good Design
1. the rendered pages are responsive and can automatically resize.
2. some error handlings are done. For example, duplicate/empty username will result in error codes 
3. use of RESTful design principles 
4. use HTTP status code when responding to client
5. most of functions are asynchronous

To be improved
1. I did not write server by dividing multiple routers
2. I did not consider minimizing file transfers when writing the code
