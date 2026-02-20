

## Insert New Producer Names into the Database

### Goal
Add new producer names from the provided list into the `producers` table as placeholder entries. Names already in the database will be skipped.

### What Already Exists
After querying the `producers` table, the following names from your list are **already in the system** and will be skipped (no duplicates):

Adam Armesto, Adam Keely, Alessia Gatti, Alex Anagnostatis, Ali Ryder, Alicia Etheridge-Brown, Alix Margolis, Andrew O'Connor, Andrew Paparone, Anfernee Aguado, Angel J. Rosa (exists as "Angel J. Rosa"), Annie DeSanctis, Chase Moran, Dain August, Dan Lubell, Dani Abraham, Danny Pollack, David Wept, Dustin Highbridge, Elisabeth Makitalo, Ella Cepeda, Erik Mateo, Gabriel Mouritzen, Galileo Mondol, Garrett Brock, Gervais Maillard, Glen Matheny, Huda Yousef, J'Tasha St. Cyr (exists with space before "Cyr"), Jagger Corcione, James Chan, James Exley, Jason Offor, Jay Tauzin, Jon Applebaum, Jonny Rios, KeAmbra Tianez, Kira Leinonen, Lach McClellan, Lex Dewart, Louis Moreschi, Luke Gilbert, Mabel Marquez Garcia, Malcolm West, Marques Houston, Matisse Gaillard, Michael Borgers, Monica Floyd, Morgana Yasmeen, Nat Prinzi, Nazh Dell, Nick Comardo, Nick Slater, Nico Scandiffio, Noelle Victoria, Nour Sayeh, Pure Brisbon, Ricky Zanders, Robert Valentino, Robert Vornkahl, Ryan Silver, Sam King, Sara Lacombe, Sara Takata, Satien Mehta, Seana Bruff, Susan Papa, Tali Weizman, Tashi Bhutia, Theo Croker, Trevor Thompson, Vanessa Amador, Victoria Pavon, William Noyce, Zoe Travis, Zylo Hefferan

### Names to be Added (~140 new entries)
All new names will be inserted with the standard placeholder defaults:
- `is_placeholder = true`
- `has_claimed_account = false`
- `verification_status = 'unverified'`
- `account_status = 'active'`

The new names include: Aaron Huisman, Abi Perl, AJ Groy, Alastair Surprise, Alesiette Mayweather, Alex Dewart, Alice Steiner, Amanda Mortimer, Amanjah Anthony, Amy Laslett, Antoine Allen, Antonio Flores, Aser Santos Jr, Ashlyn Des Roches, Austin Simkins, Barry Krause, Marcus Turner, Ben Marc, Boris Labourguigne, Brady Spear, Brandon Loftin, Brittani Burgess, Bryan Garcia, Carlos Lopes, Carol Costanzo, Caroline Hartly, Riley Robbins, Chelsea Low, Chris Argueta, Claire Bishara, Craig Thomas, Dani Aquino, Daniel Yaro, Danielle Vornkahl, Darius Jackson, David Garfinkle, David Kornfield, Deborah Fenstermacher, Doug Bilitch, Dylan D. Underhill, Edgar Esteves, Elisa Morse, Eric Rey, Erik Ziemba, Erika Hibler, Farzin Toussi, Gabrielle Collins, Garral Odunlade, Garrett Nicholson, Gennifer Gardiner, Ghena Fefelov, Greg Anderson, Hans Boysen, Harris Ansari, Harrison Corwin, Harrison Hawkins, Henry "Blaq" Butler, Ian McClellan, Isaiah Milfort, Ivonne Escobar, JakeTheShooter, Jalysa Scales, James Hagedorn, Jaquece "Q" Abraham, Jarell Houston, Jake McKenna, Jason Berger, Jay Renfroe, Jazmyne Fuentes, Jean Grant, Jeff Conroy, Jeremy Burkett, Joey Szela, John Montoya, Jonathan Marroquin, Julio Durango, Justin Floyd, Sydney Nomoura, Keke Palmer, Kevin Douglas, Kevin Lopez, Laura Buckles, Lenoria Addison, Leslie Pham, Liam Akiva, Lola Ridgell, Lyndsay Moretta, Mark Favreau, Mark Ford, Marquis Abrahams, Mathilde Dorschner, Matt Mrok, Max Denby, Mia Novak, Michael Blevins, Michael Pashan, Mike Holland, Misti Karma, Misti Whack, Monique Scott, Monyette Buie, Najah Elessie, Nathan Hengstebeck, Nayele Alamilla, Nicole Mendez, Nicole Wu, Nolan Riddle, Pam Glennon, Pat Aviles, Patrick Phillips, Paul O'Hannigan, Pim Verhaert, Ray Siegle, Rick Dula, Robert Valentine, Matt Alonzo, Rodney Brown, Roman Mitichyan, Ruben Acevedo, Saaya Temori, Sam Malko, Samantha Manalang, Sarah El Kawand, Sean Dash, Shaina Farrow, Sharon Palmer, Sheena House, Shiloh Feldman, Silvia Durango, Stash Slionski, Stephanie Madrigal, Stephanie Wiand, Steven Tobiasz, Tara Long, Tarek Albaba, Taylor Harrington, Tigran Mutafyan, Tina Reeves, Miguel Lopez, Tyler Perez, Vic Brandt, Victor Williams, Victoria Vallas, Vincente DiSanti, Vlad Vovk, Wyatt Whitaker, Yofray, Lukas Haixiao Lu

### Near-Matches (inserted as new, distinct entries)
- "Angel J Rosa" (no period) vs existing "Angel J. Rosa" -- will be added as-is since the user provided it without the period
- "Aser Santos Jr" vs existing "Aser Santos" -- different identity, will be added
- "Ashlyn Des Roches" vs existing "Ashley Des Roches" -- different first name, will be added
- "J'Tasha St.Cyr" vs existing "J'Tasha St. Cyr" -- will be added as-is (minor formatting difference)
- "Yofray" vs existing "Yofray Ray" -- shorter version, will be added as distinct

### Implementation
- **No code changes** -- data-only operation using the insert tool
- **No schema changes** -- using existing `producers` table structure
- Single batch INSERT with all ~140 new names

### What Will NOT Change
- Existing producer records (no updates, no deletions)
- Frontend code
- Database schema
- Any other tables

### Verification
- Query `SELECT count(*) FROM producers` before and after to confirm the count increased by the expected number
- Spot-check a few new names: `SELECT name FROM producers WHERE name IN ('Aaron Huisman', 'Keke Palmer', 'Vlad Vovk')`

