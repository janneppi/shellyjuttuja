//__REPLACED_WITH_MAIN_CODE__

/**
 * Tämä käyttäjäskripti ylikirjoittaa 1. ohjauksen lähdön tarvittaessa
 * P1 sähkömittarin kokonaiskulutuksen minuutin keskiarvon perusteella.
 * 
 * Idea on, että jos kulutusta on jo 6kw ei anneta sähköjen mennä päälle, ettei oteta liikaa virtaa verkosta kun sulakkeet on 3x25A.
 *
 */
 
function USER_OVERRIDE(inst, cmd, callback) {
  //Otetaan tila talteen
  const state = _; 
  //Jos kyseessä on joku muu ohjaus kuin #1 niin ei tehdä mitään
  if (inst != 0) {
    callback(cmd);
    return;
  }
  try {
//    console.log("Suoritetaan USER_OVERRIDE. Ohjauksen tila ennen: ", cmd); 
    if (apw >= 6000) {
      console.log("Keskiarvoteho " + apw + " yli raja-arvon, muutetaan ohjausta.");
      // koska oma rele on aina päällä mallia, on signaalit toisinpäin.
      cmd = false;
    } else {
      console.log("Keskiarvoteho " + apw + " alle raja-arvon, ei muutosta.");      
    }
//    console.log("USER_OVERRIDE suoritettu. Ohjauksen tila nyt: ", cmd);
    callback(cmd);
  } catch (err) {
    console.log("Virhe tapahtui USER_OVERRIDE-funktiossa. Virhe:", err);
    state.si[inst].str = "Ohjauksen virhe:" + err;
    callback(cmd);
  }
}

function makeAveragerWithReset(maxCount) {
  var sum = 0;
  var count = 0;
  if (typeof maxCount === "undefined") {
    maxCount = 6; // default
  }
  return function(value) {
    if (typeof value === "number") {
      sum += value;
      count++;
    }
    var average = count === 0 ? 0 : sum / count;
    // Reset after reaching maxCount
    if (count >= maxCount) {
      sum = 0;
      count = 0;
    }
    return Math.ceil(average);
  };
}

function fetchActivePower() {
  let req = { url: "http://<P1 mittarin IP>/api/v1/data", timeout: 5 };
  //console.log("Haetaan P1-dataa:", req.url);
  Shelly.call("HTTP.GET", req, function (res, err, msg) {
    try {
      req = null;    
      if (err === 0 && res != null && res.code === 200 && res.body) {
        let data = JSON.parse(res.body);
        res.body = null;
          apw = data.active_power_w;
        } else if (err === 0) {
          throw new Error("Virheellinen data");
        } else {
          throw new Error("Datan haku epäonnistui: " + msg);
        }
//        console.log("fetchActivePower: " + apw);
    } catch (e) {
      console.log("Virhe HTTP.GET -kutsussa:", e);
    }
  } );
}

function USER_LOOP() {  
  fetchActivePower();
  averager(apw);
//  console.log("Average power: " + averager(apw));
  loopRunning = false;
}
//muuttuja average power watts apw ja averager funkito joka laskee keskiarvon määritellyn ikkunan mukaan, oletus 6 on 6x10 sek eli minuutin sisällä
var apw = null;
averager = makeAveragerWithReset(6);
