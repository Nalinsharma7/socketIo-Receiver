/*
 *********************************************************************************************************************************************************
 * License Information :Accord Software & Systems Pvt. Ltd.                  																		    *
 *                      #37, Krishna Reddy Colony, Domlur layout,                                                                                        *
 *                      Domlur,Bangalore - 560071, INDIA                                                                                                 *
 *                      Licensed software and All rights reserved.                                                                                       *
 *********************************************************************************************************************************************************
 * File                : msilparser-s.js																									                *
 *																			                                                                            *
 * Description         : This module fetches the route points for the given route under the given account,group,parent_group.								*
 * 																				                                                                        *
 * Author(s)           : Aditya k Zingaruche,Mahantesh Maningol																							*
 *																			                                                                            *
 * Version History     :                                                                                                                                 *
 * <Version Number>           <Author>                <date>            <defect Number>            <Modification made and the reason for modification>   *
 *   3.0                    Aditya k Zingaruche       27.02.2019         --                         2nd deliverable                                      *
 *   3.1                    Mahantesh Maningol        07.11.2019         --                         3rd deliverable                                      *
 * References          :                                                                                                                                 *
 * Assumption(s)       : NT262_message_format(3-07-2019) - NT262_Message_Formats_NipponMSILrevised (3)                                                   *
 * Constraint(s)       : 1) Message format defined in the document should be followed. Any small changes may result in packet rejections.                *
 *                       2) Request format should be agreed on the both sides and then followed.
 *                                                                    *
 *********************************************************************************************************************************************************
 */

//Parser for NipponMSIL NT262_message_format (12-07-2019)
// require("colors");
// require('moment');
// , mysql = require('mysql');
var result = [];
// const persistance = require('./dataopr');
// var {
//     checkDeviceIsRegistred
// } = require('./helpers/helperFunctions')
// require('winston-daily-rotate-file');
// var winston = require('winston');
// var updateCmdQueue = require('./command_sending/update_cmd_queue');
// var parseCCPck = require('./parseCCPck');

// var logger = winston.loggers.get('errorLogger');
// var ackLogger = winston.loggers.get('ackLogger');
var res = {};

//Kam 30 Apr 22
// let serconf = require("./serverconf");
var ready = 0;

// var kafka = require('kafka-node');
// const client = new kafka.KafkaClient(serconf.Event_producer); //103.233.79.237:9092
// const client1 = new kafka.KafkaClient(serconf.MSILAGL_producer);
// const client2 = new kafka.KafkaClient(serconf.MSILNAGHA_producer);
// const Producer123 = kafka.Producer;
// var producer = new Producer123(client);    //for 9092-Event
// var producer1 = new Producer123(client1);  //for 9093-MSILAGL
// var producer2 = new Producer123(client2);  //for 9094-MSILNAGHA

exports.parser = function decode(data) {
  res = {};
  //   console.log(data);
  // console.log(" to parser: ",data.length,data);
  let i = (data.match(/\$/g) || []).length;
  // console.log(i)
  if (data.match(/\$E!/g) && i == 8) {
    console.log("here");
    // login Message
    // var str = data.replace();
    // var splitData = [];
    // splitData = str.split(",");
    // parse(splitData)
  } else {
    result = [];
    var buffer = "";
    buffer += data;
    let boundary = buffer.indexOf("*");
    while (boundary !== -1) {
      var str = buffer.substr(0, boundary);

      buffer = buffer.substr(boundary + 1);
      boundary = buffer.indexOf("*");
      let i = (str.match(/\$/g) || []).length;
      if (i == 1) {
        str = str.replace(/\,$/, "");
        var splitData = [];
        splitData = str.split(",");
        // .filter(function(str) {
        //     return /\S/.test(str);
        // });
        // console.log(splitData)

        //Uncomment for the checksum verification
        /*try {
                    console.log("->",str)
                    if (checksum(str)) {
                       parse(splitData);
                        console.log("Checksum Successful");
                    } else {
                        console.log("Checksum failure");
                        return "Invalid Packet!";
                    }

                } catch (err) {
                    console.log('err', err);
                    // logger.info(`${datetime} Error:${error} packet :${splitData.join(',')}`);
                    throw err;
                }*/

        //Without checksum verification
        parse(splitData);
      } else {
        decode(str);
      }
    }
  }

  function checksum(str) {
    //Temporary patch for checksum
    str = str.replace(/\s/g, "+");
    var pck = str.substr(0, str.length - 2);
    pck = "data=" + pck;

    let arr = str.split(",");
    let cs = arr[arr.length - 1];
    var checksum = 0xff;

    for (i = 1; i < pck.length; i++) {
      checksum = checksum ^ pck.charCodeAt(i);
    }

    if (checksum.toString(16).toUpperCase() == cs.toUpperCase()) {
      return true;
    }
    return false;
  }

  var datetime = new Date()
    .toString()
    .replace("GMT+0530 (India Standard Time)", "");

  function parse(splitData) {
    if (splitData.length == 9) {
      //    Login Message
    } //<=main if closed
    else {
      if (splitData.some((item) => item == "") == true) {
        // logger.info(`${datetime} Error:Empty data packet :${splitData.join(',')}`);
        // console.log('recived empty')
        return "recived";
      }

      if (splitData.some((item) => item == "ND") == true) {
        // var string = splitData.join(',');
        // acpckLogger.info(`${datetime} faulty index:${element} packet :${string}`);
        var data = {
          deviceID: splitData[3],
          health_status: "faulty",
          timestamp: Math.floor(Date.now() / 1000),
        };
        persistance.emit("faultydevice", data);
        // return false;
      }
      var packetType = splitData[1];
      //console.log('packetType:', packetType)
      var immobAlerts = [
        "IMW",
        "IMT",
        "IME",
        "IMR",
        "IMN",
        "IMO",
        "IMI",
        "IMA",
      ];
      var alert = immobAlerts.includes(packetType);
      if (packetType == "NR" || alert) {
        try {
          if (alert) {
            console.log("IM alert packet");
            ackLogger.info(datetime + " > " + JSON.stringify(splitData));
            updateCmdQueue
              .updateImmobCmdStatus({
                responseType: splitData[1],
                imei: splitData[5],
                senderID: splitData[61],
                timestamp: Math.floor(Date.now() / 1000),
              })
              .then((result) => {
                if (result.status == 1) {
                  ackLogger.info(
                    datetime +
                      "> IMEI = " +
                      splitData[4] +
                      " Command = " +
                      splitData[1] +
                      "Immob command alert not updated"
                  );
                  console.log("Immob command alert updated");
                } else {
                  ackLogger.info(
                    datetime +
                      "> IMEI = " +
                      splitData[4] +
                      " Command = " +
                      splitData[1] +
                      "Immob command alert not updated"
                  );
                  console.log("Immob command alert not updated");
                }
              })
              .catch((err) => {
                if (err.hasOwnProperty("status")) {
                  logger.info(datetime + ">" + err.data);
                } else {
                  logger.info(datetime + ">" + err.message);
                }
              });
          } else {
            console.log("Abhishek Line number 181");
            console.log("Normal packet");
          }
          res = normal(splitData);
        } catch (err) {
          console.log("err", err);
          // logger.info(`${datetime} Error:${error} packet :${splitData.join(',')}`);
          throw err;
        }
      } else if (packetType == "AC") {
        console.log("AC switch data");
        try {
          res = acpck(splitData);
        } catch (err) {
          console.log("err", err);
          // logger.info(`${datetime} Error:${error} packet :${splitData.join(',')}`);
          throw err;
        }
      } else if (packetType == "AZ") {
        console.log("Acceleration in Z axis");
        try {
          res = azpck(splitData);
        } catch (err) {
          console.log("err", err);
          // logger.info(`${datetime} Error:${error} packet :${splitData.join(',')}`);
          throw err;
        }
      } else if (packetType == "CC") {
        try {
          updateCmdQueue
            .updateCmdQueueAsPerCCPck({
              senderID: splitData[23],
              imei: splitData[4],
            })
            .then((result) => {})
            .catch((error) => {
              console.log("error:", error);
              logger.info(
                `${datetime} Error:${error} packet :${splitData.join(",")}`
              );
            });
          // res =  parseCCPck.ccPck(splitData);
        } catch (err) {
          // console.log('err', err);
          logger.info(
            `${datetime} Error:${error} packet :${splitData.join(",")}`
          );
          throw err;
        }
      }
    } //<=main else close
    res.creationTime = Math.floor(Date.now() / 1000);

    if ((packetType == "NR" || alert) && res) {
      persistance.emit("addNormal", res);
    } else if (packetType == "AC" && res) {
      // console.log("response(AC)",res)

      //if(checksum=="B5")
      //{
      persistance.emit("addAC", res);
      //}
    } else if (packetType == "AZ" && res) {
      //console.log("response(AZ)",res);
      //if(checksum=="A7")
      //{
      persistance.emit("addAZ", res);
      //}
    } else if (packetType == "CC" && res) {
      // persistance.emit('addNormal',res);
    }
  }
  return res;
}; //<=Function closed

function normal(splitData) {
  // var t0 = performance.now();
  // var t1 = performance.now();
  // console.log("Call to doSomething took " + (t1 - t0) + " milliseconds.");

  // let res={};
  res.packetType = splitData[1];
  res.alertId = splitData[2];
  res.packetStatus = splitData[3];
  res.firmwareVersion = splitData[4];
  // var deviceID = splitData[5];
  // var response =  checkDeviceIsRegistred(deviceID)
  // console.log('response:', response)
  // if (response.hasOwnProperty('message')) {
  //     throw new Error(response.message)
  // } else if (response == 0) {
  //     throw new Error("Device is not registred")
  // } else {
  //     console.log("hi");
  res.deviceID = splitData[5];
  // }
  res.gpsFix = parseInt(splitData[6]);

  // timestamp creation
  if (splitData[7].length == 6 && splitData[7] != 0) {
    splitData[7] =
      splitData[7].toString().slice(0, 4) +
      "20" +
      splitData[7].toString().slice(4);
  }
  var date = parseInt(
    splitData[7].substring(4, 8) +
      splitData[7].substring(2, 4) +
      splitData[7].substring(0, 2)
  );
  var time = parseInt(splitData[8]);
  if ((date == 0 || time == 0) && res.packetStatus == "L") {
    res.timestamp = Math.floor(Date.now() / 1000);
  } else {
    if (date && time) {
      time = splitData[8].toString().padStart(6, "0");
      //  console.log("time",time)
      date = date.toString();
      time = [time.slice(0, 2), ":", time.slice(2)].join("");
      time = [time.slice(0, 5), ":", time.slice(5)].join("");
      date = [date.slice(0, 4), "-", date.slice(4)].join("");
      date = [date.slice(0, 7), "-", date.slice(7)].join("");
      var datetime = date + "T" + time;
      var timestamp = Math.round(new Date(datetime) / 1000);
      timestamp = timestamp + 19800;
      // console.log("IST",timestamp)
      if (isNaN(timestamp)) {
        res.timestamp = 0;
      } else {
        res.timestamp = timestamp;
      }
    } else {
      res.timestamp = 0;
    }
  }
  //  timestamp creation

  //----------------------------------------------------------------------------CHANGES START FROM HERE (DONE BY NALIN SHARMA)-------------------------------------------

  // 6 Values of Lat
  let latitude = "";
  for (let i = 0; i < 6; i++) {
    latitude += splitData[9 + i] + ",";
  }

  res.latitude = latitude;
  // res.latitude = parseFloat(splitData[9]);
  res.latitudeDir = splitData[15]; //Expecting "N" to come only once, else indexing will be effected accordingly.

  let longitude = "";
  for (let i = 0; i < 6; i++) {
    longitude += splitData[16 + i] + ",";
  }
  res.longitude = longitude;
  // res.longitude = parseFloat(splitData[11]);

  res.longitudeDir = splitData[22];

  var noOfSatelites = parseInt(splitData[23]);
  res.noOfSatelites = noOfSatelites;
  var gsmSignalStrength = parseInt(splitData[24]);
  res.gsmSignalStrength = gsmSignalStrength;
  res.hdop = parseFloat(splitData[25]);
  var ignition = parseInt(splitData[26]);
  res.ignition = ignition;
  res.temperAlert = splitData[27];
  // console.log("****************************************************",splitData[17])
  //  res.temperAlert = Math.floor(Date.now() / 1000);
  res.mainInputVoltage = parseFloat(splitData[28]);
  res.mainPowerStatus = parseInt(splitData[29]);
  res.internalBatteryVoltage = parseFloat(splitData[30]);

  res.DistRollCntrAvg =
    splitData[31] == "NA" || splitData[31] == "ND" ? "0" : splitData[31];
  res.FuelCons =
    splitData[32] == "NA" || splitData[32] == "ND"
      ? "0"
      : (parseFloat(splitData[32]) / 36).toFixed(2);

  // console.log("fuel cons: ",res.FuelCons);

  canType("122", splitData[33]);
  canType("124", splitData[34]);
  canType("310", splitData[35]);
  canType("314", splitData[36]);
  canType("318", splitData[37]);
  canType("380", splitData[38]);
  canType("381", splitData[39]);
  canType("3D0", splitData[40]);
  canType("3D1", splitData[41]);
  canType("3D9", splitData[42]);
  canType("3B9", splitData[43]);
  canType("460", splitData[44]);
  canType("3C3", splitData[45]);
  canType("3BF", splitData[46]);
  canType("3A0", splitData[47]);
  canType("1B6", splitData[48]);
  canType("3EF", splitData[49]);
  canType("3CB", splitData[50]);
  canType("3CC", splitData[51]);
  canType("1DF", splitData[52]);
  canType("3C2", splitData[53]);
  canType("4BA", splitData[54]);
  canType("4BB", splitData[55]);
  canType("4BC", splitData[56]);

  data = splitData[57].replace("@", "");
  //If empty setting Default values.
  // if((splitData[22] == "NA" && data=="NA" ) || (splitData[22] == "ND" && data=="ND" )){
  if (data == "NA" || data == "ND") {
    res.AccEff_Pos = "0,0,0,0,0,0,0,0,0,0";
  } else {
    var raw = rawdata(data);
    raw = Buffer.from(raw, "hex");
    AccEff_Pos = "";
    // AccEff_Pos+=res.AccEff_Pos+","
    for (let i = 0; i < raw.length; i++) {
      n = raw[i];
      // if(i==raw.length-1)
      // {
      //     AccEff_Pos +=Math.round(phyval(n, 100 / 255, 0));
      // }
      // else{
      AccEff_Pos += Math.round(phyval(n, 100 / 255, 0)) + ",";
      // }
    }
    // res.AccEff_Pos = AccEff_Pos + res.AccEff_Pos;
    res.AccEff_Pos = AccEff_Pos;
  }

  data = splitData[58];
  //If empty setting Default values.
  if (data == "NA" || data == "ND") {
    res.VehSpd = "0,0,0,0,0,0,0,0,0,0";
  } else {
    raw = rawdata(data);
    raw = Buffer.from(raw, "hex");
    VehSpd = "";
    // VehSpd+=res.VehSpd+",";
    for (let i = 0; i < raw.length - 1; i++) {
      n =
        raw[i].toString(16).padStart(2, "0") +
        raw[i + 1].toString(16).padStart(2, "0");
      // console.log('n:', n)

      n = parseInt(n, 16);
      //    if(i==raw.length-2)
      //    {
      //        VehSpd +=Math.round(phyval(n, 1 / 128, 0));
      //    }
      //    else{
      VehSpd += Math.round(phyval(n, 1 / 128, 0)) + ",";
      //    }
      i++;
    }
    //  res.VehSpd = VehSpd + res.VehSpd;
    res.VehSpd = VehSpd;
  }

  data = splitData[59];
  //If empty setting Default values.
  if (data == "NA" || data == "ND") {
    res.ACSwitch_On_BCM = "0,0,0,0,0,0,0,0,0,0";
  } else {
    ACSwitch_On_BCM = "";
    let cheat = 0;

    // ACSwitch_On_BCM+=res.ACSwitch_On_BCM+","
    for (let i = 0; i < 60; i++) {
      // if(i==8)
      // {
      //     ACSwitch_On_BCM+=data.substring(i,i+1);
      // }
      // else{
      if (data.substring(i, i + 1) == 1) {
        cheat += 1;
      }
      ACSwitch_On_BCM += data.substring(i, i + 1) + ",";
      // }
    }

    if (cheat > 2) {
      //Changes by Nalin  to manipulate AC data 29.6.23
      res.ACSwitch_On_BCM = "1,1,1,1,1,1,1,1,1,1";
    } else {
      res.ACSwitch_On_BCM = "0,0,0,0,0,0,0,0,0,0";
    }
    // res.ACSwitch_On_BCM = ACSwitch_On_BCM + res.ACSwitch_On_BCM;
    // res.ACSwitch_On_BCM = ACSwitch_On_BCM ;
  }

  data = splitData[60];
  // console.log('data ',data);
  //If empty setting Default values.
  if (data == "NA" || data == "ND") {
    res.OthrDoorSwitch_Sts = "0,0,0,0,0,0,0,0,0,0";
  } else {
    OthrDoorSwitch_Sts = "";

    // console.log(data,data.length);
    // OthrDoorSwitch_Sts+=res.OthrDoorSwitch_Sts+","
    // console.log('OthrDoorSwitch_Sts:', OthrDoorSwitch_Sts)
    for (let i = 0; i < data.length; i++) {
      // if(i==data.length-1)
      // {
      //     OthrDoorSwitch_Sts+=data.substring(i,i+1);
      // }
      // else{

      OthrDoorSwitch_Sts += data.substring(i, i + 1) + ",";
      // console.log('i '+i,' OthrDoorSwitch_Sts ',OthrDoorSwitch_Sts);
      // }
    }

    // res.OthrDoorSwitch_Sts = OthrDoorSwitch_Sts + res.OthrDoorSwitch_Sts;
    res.OthrDoorSwitch_Sts = OthrDoorSwitch_Sts;
  }

  data = splitData[61];
  // console.log('data ',data);
  //If empty setting Default values.
  if (data == "NA" || data == "ND") {
    res.DriverDoorSwitch_Sts = "0,0,0,0,0,0,0,0,0,0";
  } else {
    DriverDoorSwitch_Sts = "";

    // console.log(data,data.length);
    // DriverDoorSwitch_Sts+=res.DriverDoorSwitch_Sts+","
    // console.log('DriverDoorSwitch_Sts:', DriverDoorSwitch_Sts)
    for (let i = 0; i < data.length; i++) {
      // if(i==data.length-1)
      // {
      //     DriverDoorSwitch_Sts+=data.substring(i,i+1);
      // }
      // else{

      DriverDoorSwitch_Sts += data.substring(i, i + 1) + ",";
      // console.log('i '+i,' DriverDoorSwitch_Sts ',DriverDoorSwitch_Sts);
      // }
    }

    // res.DriverDoorSwitch_Sts = DriverDoorSwitch_Sts + res.DriverDoorSwitch_Sts;
    res.DriverDoorSwitch_Sts = DriverDoorSwitch_Sts;
  }

  data = splitData[62];
  // console.log('data ',data);
  //If empty setting Default values.
  if (data == "NA" || data == "ND") {
    res.SeatbeltDriver_SW_from_BCM = "0,0,0,0,0,0,0,0,0,0";
  } else {
    SeatbeltDriver_SW_from_BCM = "";

    // console.log(data,data.length);
    // SeatbeltDriver_SW_from_BCM+=res.SeatbeltDriver_SW_from_BCM+","
    // console.log('SeatbeltDriver_SW_from_BCM:', SeatbeltDriver_SW_from_BCM)
    for (let i = 0; i < data.length; i++) {
      // if(i==data.length-1)
      // {
      //     SeatbeltDriver_SW_from_BCM+=data.substring(i,i+1);
      // }
      // else{

      SeatbeltDriver_SW_from_BCM += data.substring(i, i + 1) + ",";
      // console.log('i '+i,' SeatbeltDriver_SW_from_BCM ',SeatbeltDriver_SW_from_BCM);
      // }
    }

    // res.SeatbeltDriver_SW_from_BCM = SeatbeltDriver_SW_from_BCM + res.SeatbeltDriver_SW_from_BCM;
    res.SeatbeltDriver_SW_from_BCM = SeatbeltDriver_SW_from_BCM;
  }

  data = splitData[63];
  // console.log('data ',data);
  //If empty setting Default values.
  if (data == "NA" || data == "ND") {
    res.BrkPedalSwitchActive = "0,0,0,0,0,0,0,0,0,0";
  } else {
    BrkPedalSwitchActive = "";

    // console.log(data,data.length);
    // BrkPedalSwitchActive+=res.BrkPedalSwitchActive+","
    // console.log('BrkPedalSwitchActive:', BrkPedalSwitchActive)
    for (let i = 0; i < data.length; i++) {
      // if(i==data.length-1)
      // {
      //     BrkPedalSwitchActive+=data.substring(i,i+1);
      // }
      // else{

      BrkPedalSwitchActive += data.substring(i, i + 1) + ",";
      // console.log('i '+i,' BrkPedalSwitchActive ',BrkPedalSwitchActive);
      // }
    }

    // res.BrkPedalSwitchActive = BrkPedalSwitchActive + res.BrkPedalSwitchActive;
    res.BrkPedalSwitchActive = BrkPedalSwitchActive;
  }

  Xacc = "";
  data = splitData[64];
  // console.log(data)
  for (let i = 0; i < data.length - 4; ) {
    if (i == data.length - 5) {
      Xacc += parseInt(data.substring(i, i + 5)) / 100;
    } else {
      Xacc += parseInt(data.substring(i, i + 5)) / 100 + ",";
    }
    i += 5;
  }
  res.Xacc = Xacc;

  Yacc = "";
  data = splitData[65];
  for (let i = 0; i < data.length - 4; ) {
    if (i == data.length - 5) {
      Yacc += parseInt(data.substring(i, i + 5)) / 100;
    } else {
      Yacc += parseInt(data.substring(i, i + 5)) / 100 + ",";
    }
    i += 5;
  }
  res.Yacc = Yacc;

  Zacc = "";
  data = splitData[66];
  for (let i = 0; i < data.length - 4; ) {
    if (i == data.length - 5) {
      Zacc += parseInt(data.substring(i, i + 5)) / 100;
    } else {
      Zacc += parseInt(data.substring(i, i + 5)) / 100 + ",";
    }
    i += 5;
  }
  res.Zacc = Zacc;

  Xgyro = "";
  data = splitData[67];
  for (let i = 0; i < data.length - 3; ) {
    if (i == data.length - 4) {
      Xgyro += parseInt(data.substring(i, i + 4)) / 10;
    } else {
      Xgyro += parseInt(data.substring(i, i + 4)) / 10 + ",";
    }
    i += 4;
  }
  res.Xgyro = Xgyro;

  Ygyro = "";
  data = splitData[68];
  for (let i = 0; i < data.length - 3; ) {
    if (i == data.length - 4) {
      Ygyro += parseInt(data.substring(i, i + 4)) / 10;
    } else {
      Ygyro += parseInt(data.substring(i, i + 4)) / 10 + ",";
    }
    i += 4;
  }
  res.Ygyro = Ygyro;

  Zgyro = "";
  data = splitData[69];
  for (let i = 0; i < data.length - 3; ) {
    if (i == data.length - 4) {
      Zgyro += parseInt(data.substring(i, i + 4)) / 10;
    } else {
      Zgyro += parseInt(data.substring(i, i + 4)) / 10 + ",";
    }
    i += 4;
  }
  res.Zgyro = Zgyro;

  res.serviceCell = splitData[70];
  res.operator = splitData[71];
  res.sequenceNo = splitData[72];
  res.immobState = splitData[73];
  if (splitData[1] == "NR") {
    res.frameNumber = splitData[74];
  } else {
    res.frameNumber = splitData[75];
  }
  checksum = splitData[73];
  // }catch(error){
  //     console.log(error.stack);
  //     logger.info(`${datetime} Error:${error} packet :${splitData.join(',')}`);
  // }
  // console.log("checksum: %s",checksum=="AB")
  // console.log('res:', res)
  return res;
} //<== Normal packet Close

// =============================================================================================

// Function definations
function canType(pid, data) {
  if (data != "NA" && data != "ND") {
    // console.log("CAN data",data,pid,"can")
    var n, f, o;
    var raw = rawdata(data);
    raw = Buffer.from(raw, "hex");
    // console.log("raw",pid,raw);
    switch (pid) {
      case `122`:
        // res.AccEffPos_Val = bitExtracter(raw[0], 1, 5);

        n = raw[2]; /**Complete 2nd byte from raw Data */
        res.AccEff_Pos = Math.round(phyval(n, 100 / 255, 0));

        n = raw[1]; /**Complete 1nd byte from raw Data */
        res.AccAct_Pos = Math.round(phyval(n, 100 / 255, 0));

        // res.AccActPos_val=bitExtracter(raw[0],1,7);
        break;
      case `124`:
        // res.EngSpeed_Validity = bitExtracter(raw[0], 1, 7);

        n =
          raw[1].toString(16).padStart(2, "0") +
          raw[2].toString(16).padStart(2, "0");

        n = parseInt(n, 16);

        res.Eng_Speed = Math.round(phyval(n, 0.25, 0));
        break;

      case `310`:
        // res.EngCoolantTemp_Validity = bitExtracter(raw[0], 1, 7);

        res.EngFuelType = bitExtracter(raw[0], 1, 4);

        res.EngEmRelated_Malfun = bitExtracter(raw[0], 2, 0);

        n = raw[1];
        // console.log('n-->',n)
        res.EngCoolant_Temp = phyval(n, 1, -40);

        res.EngOil_Info = bitExtracter(raw[3], 2, 6);

        // res.WaterinFuelFilterIndiOn = bitExtracter(raw[3], 1, 1);
        break;

      case `314`:
        // res.VehSpdVal = bitExtracter(raw[0], 1, 7);
        // res.FuelConsVal = bitExtracter(raw[0], 1, 5);

        n =
          raw[1].toString(16).padStart(2, "0") +
          raw[2].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.VehSpd = Math.round(phyval(n, 1 / 128, 0));
        n =
          raw[5].toString(16).padStart(2, "0") +
          raw[6].toString(16).padStart(2, "0");

        // n = parseInt(n, 16);
        // // console.log("0x314",n)
        // res.FuelCons = phyval(n, 0.005, 0);

        res.DistRollCntrAvg_Val = bitExtracter(raw[3], 1, 7);
        res.DistRollCntrAvgReset_Occurred = bitExtracter(raw[3], 1, 6);
        n =
          bitExtracter(raw[3], 5, 0).toString(16).padStart(2, "0") +
          raw[4].toString(16).padStart(2, "0");
        // console.log("0x314",n)

        // n = parseInt(n, 16);
        // // console.log("0x314",n)
        // res.DistRollCntrAvg = phyval(n, 1 / 8, 0);

        break;

      case `318`:
        res.BrkPedalSwitchActive = bitExtracter(raw[0], 1, 2);
        res.EngRunningSts = bitExtracter(raw[0], 2, 0);
        res.ChargeWarnReq_ECM = bitExtracter(raw[1], 1, 6);
        // res.HotTempIndi_On = bitExtracter(raw[6], 2, 6);
        break;

      case `380`:
        res.TM_EmiRelMalfunc_Active = bitExtracter(raw[0], 1, 0);
        break;

      case `381`:
        // res.TM_FailWarn_Req = bitExtracter(raw[0], 2, 2);
        res.ManualModeGear_Pos = bitExtracter(raw[2], 3, 0);
        // console.log('res.ManualModeGear_Pos:', res.ManualModeGear_Pos)
        // res.TM_GearPosIndi_IPCVal = bitExtracter(raw[3], 1, 7);
        // res.TM_GearPosIndi_IPC = bitExtracter(raw[3], 6, 0).toString(16).padStart(2, '0');
        break;

      case `3D0`:
      case `3d0`:
        res.BrkFluidLvl_Low_Indi_On = bitExtracter(raw[0], 1, 4);
        // res.Charge_Indi_On = bitExtracter(raw[0], 1, 1);
        res.ACSwitch_On_BCM = bitExtracter(raw[1], 1, 4);
        // res.Elec_Load_Active = bitExtracter(raw[2], 1, 3);
        res.Buzzer_Req_BCM = bitExtracter(raw[4], 6, 0);
        break;

      case `3D1`:
      case `3d1`:
        res.OthrDoorSwitch_Sts = bitExtracter(raw[0], 1, 1);
        res.DriverDoorSwitch_Sts = bitExtracter(raw[0], 1, 0);
        res.SeatbeltDriver_SW_from_BCM = bitExtracter(raw[5], 2, 6);
        // res.OutsideAirTemp_Val = bitExtracter(raw[5], 1, 2);
        // n = raw[7];
        // res.OutsideAir_Temp = phyval(n, 0.5, -40);
        break;

      case `3D9`:
      case `3d9`:
        res.Multi_Display_Info = bitExtracter(raw[4], 1, 4);
        break;

      case `3B9`:
      case `3b9`:
        n = raw[5];
        res.FuelLvlPercent_Avg = Math.round(phyval(n, 100 / 255, 0));
        // console.log("FuelLVL:",res.FuelLvlPercent_Avg);
        break;

      case `460`:
        // res.MileageInfo_Vali = bitExtracter(raw[0], 1, 7);
        n =
          bitExtracter(raw[0], 4, 0).toString(16).padStart(2, "0") +
          raw[1].toString(16).padStart(2, "0") +
          raw[2].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.Mileage_Info = phyval(n, 1, 0);
        break;

      case `3C3`:
      case `3c3`:
        res.EPS_Indication = bitExtracter(raw[0], 2, 5);
        break;

      case `3BF`:
      case `3bf`:
        res.Airbag_Deployment = raw[0];
        // res.AirbagWarn_Req = bitExtracter(raw[2], 2, 0);
        break;

      case `3A0`:
      case `3a0`:
        res.ABS_Indi_Sts = bitExtracter(raw[0], 2, 1);
        break;

      case `1B6`:
      case `1b6`:
        res.FuelSelc_Info = bitExtracter(raw[0], 4, 4);
        // res.CNG_SerLampIndi_On = bitExtracter(raw[2], 2, 4);
        // res.GasFuelLvl_IPC_Vali = bitExtracter(raw[3], 1, 6);
        res.GasFuelTemp_Vali = bitExtracter(raw[4], 1, 7);
        // res.Bifuel_Emi_Rel_Malfun = bitExtracter(raw[4], 2, 4);
        res.GasFuelLvl_IPC = bitExtracter(raw[4], 4, 0);
        n = raw[5];
        res.GasFuel_Temp = phyval(n, 0.75, -48);
        break;

      case `3EF`:
      case `3ef`:
        res.CNG_RemainFuelPressure_Vali = bitExtracter(raw[1], 1, 5);
        n =
          raw[5].toString(16).padStart(2, "0") +
          raw[6].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.CNG_RemainFuel_Pressure = phyval(n, 256 / 65536 / 10, 0);
        break;

      case `3CB`:
      case `3cb`:
        n =
          bitExtracter(raw[0], 2, 0).toString(16).padStart(2, "0") +
          raw[1].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.Bat_SOC = phyval(n, 0.1, 0);
        n = raw[4];
        res.Bat_SOH = phyval(n, 0.5, 0);
        break;

      case `3CC`:
      case `3cc`:
        n =
          bitExtracter(raw[5], 6, 0).toString(16).padStart(2, "0") +
          raw[6].toString(16).padStart(2, "0");
        n = parseInt(n, 16);

        res.BatVolt_LastCrank_peak = phyval(n, 0.0009765625, 3);
        break;

      case `1DF`:
      case `1df`:
        n = bitExtracter(raw[0], 3, 0);
        res.MachineMode_state = phyval(n, 1, 0);
        break;

      case `3C2`:
      case `3c2`:
        n = bitExtracter(raw[5], 2, 2);
        // console.log(raw[5].toString(2),n)
        res.IdlestopIndi_sts = phyval(n, 1, 0);
        break;

      case `4BA`:
      case `4ba`:
        n =
          bitExtracter(raw[0], 2, 0).toString(16).padStart(2, "0") +
          raw[1].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.AvgFuel_Cons = phyval(n, 0.1, 0);
        res.FuelCons_Unit = bitExtracter(raw[2], 2, 4);
        n =
          bitExtracter(raw[2], 2, 0).toString(16).padStart(2, "0") +
          raw[3].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.InstatFuel_Cons = phyval(n, 0.1, 0);
        break;

      case `4BB`:
      case `4bb`:
        n =
          bitExtracter(raw[0], 3, 0).toString(16).padStart(2, "0") +
          raw[1].toString(16).padStart(2, "0");
        n = parseInt(n, 16);
        res.Driving_Range = phyval(n, 1, 0);
        res.Dist_Unit = bitExtracter(raw[4], 1, 6);
        break;

      case `4BC`:
      case `4bc`:
        res.IPC_Info_LowFuel_Lvl = bitExtracter(raw[5], 1, 6);
        n = raw[7];
        res.VehModel_Info = phyval(n, 1, 0);
        break;

      case "000":
        // console.log("Can signals not found");
        break;
      default:
        console.log("Can data is Invalid", pid);
    }

    //return res;
  } else {
    var n, f, o;
    var raw = rawdata(data);
    raw = Buffer.from(raw, "hex");

    switch (pid) {
      case `122`:
        res.AccEffPos_Val = 0;
        res.AccEff_Pos = 0; //Given in document
        res.AccAct_Pos = 0;
        // res.AccActPos_val = 0;
        break;

      case `124`:
        // res.EngSpeed_Validity = 0;
        res.Eng_Speed = 0;
        break;

      case `310`:
        // res.EngCoolantTemp_Validity = 0;
        res.EngFuelType = 0;
        res.EngEmRelated_Malfun = 0; //Given in document
        res.EngCoolant_Temp = 0;
        res.EngOil_Info = 0;
        // res.WaterinFuelFilterIndiOn = 0;
        break;

      case `314`:
        // res.VehSpdVal = 0;
        // res.FuelConsVal = 0;
        res.VehSpd = 0; //Given in document
        // res.FuelCons = 0;
        res.DistRollCntrAvg_Val = 0;
        res.DistRollCntrAvgReset_Occurred = 0;
        // res.DistRollCntrAvg = 0;

        break;

      case `318`:
        res.BrkPedalSwitchActive = 0; //Given in document
        res.EngRunningSts = 0;
        res.ChargeWarnReq_ECM = 0; //Given in document
        // res.HotTempIndi_On = 0;
        break;

      case `380`:
        res.TM_EmiRelMalfunc_Active = 0; //Given in document
        break;

      case `381`:
        // res.TM_FailWarn_Req = 0;
        res.ManualModeGear_Pos = 0;
        // res.TM_GearPosIndi_IPCVal = 0;
        // res.TM_GearPosIndi_IPC = 0; //Given in document
        break;

      case `3D0`:
      case `3d0`:
        res.BrkFluidLvl_Low_Indi_On = 0;
        // res.Charge_Indi_On = 0;
        res.ACSwitch_On_BCM = 0;
        // res.Elec_Load_Active = 0;
        res.Buzzer_Req_BCM = 0;
        break;

      case `3D1`:
      case `3d1`:
        res.OthrDoorSwitch_Sts = 0; //Given in document
        res.DriverDoorSwitch_Sts = 0; //Given in document
        res.SeatbeltDriver_SW_from_BCM = 0; //Given in document
        // res.OutsideAirTemp_Val = 0;
        // res.OutsideAir_Temp = 0;
        break;

      case `3D9`:
      case `3d9`:
        res.Multi_Display_Info = 0;
        break;

      case `3B9`:
      case `3b9`:
        res.FuelLvlPercent_Avg = 0;
        break;

      case `460`:
        // res.MileageInfo_Vali = 0;
        res.Mileage_Info = 0;
        break;

      case `3C3`:
      case `3c3`:
        res.EPS_Indication = 0;
        break;

      case `3BF`:
      case `3bf`:
        res.Airbag_Deployment = 0;
        // res.AirbagWarn_Req = 0;
        break;

      case `3A0`:
      case `3a0`:
        res.ABS_Indi_Sts = 0; //Given in document
        break;

      case `1B6`:
      case `1b6`:
        res.FuelSelc_Info = 0;
        // res.CNG_SerLampIndi_On = 0;
        // res.GasFuelLvl_IPC_Vali = 0;
        res.GasFuelTemp_Vali = 0;
        // res.Bifuel_Emi_Rel_Malfun = 0;
        res.GasFuelLvl_IPC = 0;
        res.GasFuel_Temp = 0;
        break;

      case `3EF`:
      case `3ef`:
        res.CNG_RemainFuelPressure_Vali = 0;
        res.CNG_RemainFuel_Pressure = 0;
        break;

      case `3CB`:
      case `3cb`:
        res.Bat_SOC = 0;
        res.Bat_SOH = 0;
        break;

      case `3CC`:
      case `3cc`:
        res.BatVolt_LastCrank_peak = 0;
        break;

      case `1DF`:
      case `1df`:
        res.MachineMode_state = 0;
        break;

      case `3C2`:
      case `3c2`:
        res.IdlestopIndi_sts = 0;
        break;

      case `4BA`:
      case `4ba`:
        res.AvgFuel_Cons = 0;
        res.FuelCons_Unit = 0;
        res.InstatFuel_Cons = 0;
        break;

      case `4BB`:
      case `4bb`:
        res.Driving_Range = 0;
        res.Dist_Unit = 0;
        break;

      case `4BC`:
      case `4bc`:
        res.IPC_Info_LowFuel_Lvl = 0;
        res.VehModel_Info = 0;
        break;

      case "000":
        // console.log("Can signals not found");
        break;
      default:
        console.log("Can data is Invalid", pid);
    }
    // console.log("No CAN Data");
  }

  return res;
}
function phyval(n, f, o) {
  let e = n * f + o;
  return e;
}
function rawdata(hex) {
  function isOdd(n) {
    return Math.abs(n % 2) == 1;
  }
  //  newint=parseInt(hex,16)
  newint = hex;
  if (isOdd(newint.length)) {
    newint = newint.toString().padStart(newint.length + 1, "0");
  }
  // console.log(newint)
  return newint.toString();
}

// ===============================================================================

function PacketType(type) {
  switch (type) {
    case "NR":
      return "Normal periodic packet";
      break;
    case "HP":
      return "Health packet";
      break;
    case "TA":
      return "Tamper alert";
      break;
    case "TAC":
      return "Tamper Corrected";
      break;
    case "EA":
      return "Emergency alert";
      break;
    case "IN":
      return "Ignition On alert";
      break;
    case "IF":
      return "Ignition OFF alert";
      break;
    case "BR":
      return "Mains reconnected alert";
      break;
    case "BD":
      return "Mains disconnected alert";
      break;
    case "BL":
      return "Low battery alert";
      break;
    case "BH":
      return "Low battery charged alert";
      break;
    case "CC":
      return "Configuration over the air alert";
      break;
    case "HA":
      return "Harsh acceleration alert";
      break;
    case "HB":
      return "Harsh braking alert";
      break;
    case "RT":
      return "Harsh/Rash turning alert";
      break;
    case "OS":
      return "Over Speed Alert";
      break;
    case "DT":
      return "Device Tampered(sos switch tempered)";
      break;
    case "DTC":
      return "Device Tampered Corrected(sos switch tempered corrected)";
      break;
    case "ID":
      return "Ignition ON Idle Time alert";
      break;
    case "GE":
      return "Geofence Entry alert";
      break;
    case "GX":
      return "Geofence Exit alert";
      break;
    default:
      return "Invalid packet type";
      break;
  }
}

// -==============================================================================================
function AlertIdType(type) {
  switch (type) {
    case "00":
      console.log("Health packet over GPRS");
      break;
    case "01":
      console.log("Default Message");
      break;
    case "02":
      console.log("History location Update");
      break;
    case "03":
      console.log("Disconnected from main battery");
      break;
    case "04":
      console.log("Internal battery low");
      break;
    case "05":
      console.log("Internal battery charged again");
      break;
    case "06":
      console.log("Main battery connected back");
      break;
    case "07":
      console.log("Ignition On");
      break;
    case "08":
      console.log("Ignition off");
      break;
    case "09":
      console.log("Gps Box opened/Closed");
      break;
    case "10":
      console.log("Emergancy Button pressed");
      break;
    case "11":
      console.log("Emergancy state Removed");
      break;
    case "12":
      console.log("Air parameter Changed");
      break;
    case "13":
      console.log("Harsh Breaking");
      break;
    case "14":
      console.log("Harsh Acceleration");
      break;
    case "15":
      console.log("Harsh turnning");
      break;
    case "16":
      console.log("Device tempered/Corrected");
      break;
    case "17":
      console.log("Overspeed alert");
      break;
    case "18":
      console.log("Ignition On idle time");
      break;
    case "19":
      console.log("Geofence Entry");
      break;
    case "20":
      console.log("Geofence Exit");
      break;
    default:
      console.log("Invalid type Alert type");
      break;
  }
}

function bitExtracter(number, k, p) {
  //number : raw data
  //k :Number of bit extracted
  //p:position from lsb
  return ((1 << k) - 1) & (number >> p);
}

function h2d(s) {
  function add(x, y) {
    var c = 0,
      r = [];
    var x = x.split("").map(Number);
    var y = y.split("").map(Number);
    while (x.length || y.length) {
      var s = (x.pop() || 0) + (y.pop() || 0) + c;
      r.unshift(s < 10 ? s : s - 10);
      c = s < 10 ? 0 : 1;
    }
    if (c) r.unshift(c);
    return r.join("");
  }

  var dec = "0";
  s.split("").forEach(function (chr) {
    var n = parseInt(chr, 16);
    for (var t = 8; t; t >>= 1) {
      dec = add(dec, dec);
      if (n & t) dec = add(dec, "1");
    }
  });
  return dec;
}

function lsbfirst(str) {
  str = str.toString(2);
  if (str === "")
    // This is the terminal case that will end the recursion
    return "";
  else return lsbfirst(str.substr(1)) + str.charAt(0);
}

//kam
