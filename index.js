var map;
var markers; // this will hold all markers we put on the map...
var markerUpdateTimer;	// this will hold the object for the setInterval timer to auto-update the last set marker...
var followMarkerUpdates = true;

function init() 
{
	map = L.map('map').setView([50.00,10.000], 10);

	L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
		}).addTo(map);
		
// add location control to global name space for testing only
// on a production site, omit the "lc = "!
L.control.locate({follow: false}).addTo(map);

var button = new L.Control.Button('Toggle me', {
  toggleButton: 'active'
});
button.addTo(map);
button.on('click', function () {
    if (button.isToggled()) {
       	console.log("Marker Following ON");
        followMarkerUpdates = true;
    } else {
    	console.log("Marker Following OFF");
		followMarkerUpdates = false;

    }
});


L.control.scale().addTo(map);

//map.on('startfollowing', function() {
//    map.on('dragstart', lc.stopFollowing);
//}).on('stopfollowing', function() {
//    map.off('dragstart', lc.stopFollowing);
//});
}

function DoesMarkerForDeviceIDExist(DeviceID)
{
	if (markers == null)
		markers = [];
		
	if (DeviceID == null)
		return;

	for( var k=0; k<markers.length; k++ ) 
	{
		//console.log(KnownDevices[k]);
		if (markers[k].ID == DeviceID)
		{
			return markers[k].Marker;
		}
	}
	return;
}

function AddMarkerDistinct(newMarkerObject)
{
	if (markers == null)
		markers = [];
	if (newMarkerObject.ID == null)
		return;
	if (newMarkerObject.Marker == null)
		return;
	
	// check if it's already in...
	var foundmarker = false;
	for( var k=0; k<markers.length; k++ ) 
	{
		//console.log(KnownDevices[k]);
		if (markers[k].ID == newMarkerObject.ID)
		{
			console.log("Device already on the marker list");
			foundmarker = true;
			oldobject = markers[k].Marker;
			
			markers[k] = newMarkerObject;
			break;
		}
	}
	if (!foundmarker)
	{
		markers.push(newMarkerObject);
		return null;
	}
	else
		return oldobject;
}

function GetNameForDeviceID(DeviceID)
{
	if(typeof(Storage)!=="undefined")
	{
		// get it from LocalStorage or create the LocalStorage...
		if (localStorage.KnownDevices != null)
		{
			// Yes! localStorage and sessionStorage support!
			KnownDevices = JSON.parse(localStorage.KnownDevices);
			
			//console.log("KnownDevices Localstorage Content:");
			// check if the current Device is new or does already exist
			for( var k=0; k<KnownDevices.length; k++ ) 
			{
				//console.log(KnownDevices[k]);
				if (KnownDevices[k].ID == DeviceID)
				{
					return KnownDevices[k].Name;
				}
			}
		}
		return DeviceID;
	
	}
}

function GetLocation(DeviceID)
{
	// build miataru GetLocationRequest
	var GetLocationRequest = {};
	var Device = {};
	Device.Device = DeviceID;
	GetLocationRequest.MiataruGetLocation = new Array(Device);

	var GLR = JSON.stringify(GetLocationRequest);
	
	console.log("Miataru Service Request Body: "+GLR);

	// do the request
	$.ajax({
    		contentType: 'application/json',
			data: GLR,
			dataType: 'json',
			success: function(data)
			{
				// add to the map...
				console.log(data);

				if (data.MiataruLocation[0] != null)
				{
					// the Name
					var deviceName = GetNameForDeviceID(data.MiataruLocation[0].Device) + " - "+ timeSince(data.MiataruLocation[0].Timestamp)+ " ago";
					
					var newMarker = new L.marker([data.MiataruLocation[0].Latitude,data.MiataruLocation[0].Longitude]);		
				
					var newMarkerObject = {};
					newMarkerObject.ID = DeviceID;
					newMarkerObject.Marker = newMarker;

					existingMarker = DoesMarkerForDeviceIDExist(DeviceID);
					
					// this is null if not existing, or has the Marker if it exists...
					var addToMap = true;
					if (existingMarker != null)
					{
						// obviously the marker did exist previously... so we have to check it...
						if (newMarkerObject.Marker.getLatLng().lat == existingMarker.getLatLng().lat && newMarkerObject.Marker.getLatLng().lng == existingMarker.getLatLng().lng)
						{
							// it's equal... do not add
							addToMap = false;
						}		
					}

					// should it be added?					
					if (addToMap)
					{
						oldObject = AddMarkerDistinct(newMarkerObject);
						// remove the old one
						if (oldObject != null)
							map.removeLayer(oldObject);

						newMarker.addTo(map).bindPopup(deviceName).openPopup();
						
						if (followMarkerUpdates)
							map.panTo(new L.LatLng(data.MiataruLocation[0].Latitude,data.MiataruLocation[0].Longitude));

					}
					

					var Device = {};
					Device.Name = DeviceID;
					Device.ID = DeviceID;
					
					// set the timer for this device...
					markerUpdateTimer = setTimeout(function () { GetLocation(DeviceID); }, 5000);

					AddKnownDevices(Device);
				}
				else
				{
					console.log("Device could not be found");
					$('#doesnotexist').modal();
					
				}
			},
			error: function(){
				console.log("The miataru service could not be reached or returned an error.");
				},
			processData: false,
			type: 'POST',
			url: 'https://service.miataru.com/v1/GetLocation'
		   });
	
}

// TimeSince

function timeSince(date) {

	var seconds = Math.floor(((new Date().getTime()/1000) - date))
    //var seconds = Math.floor((new Date() - date) / 1000);

    var interval = Math.floor(seconds / 31536000);

    if (interval > 1) {
        return interval + " years";
    }
    interval = Math.floor(seconds / 2592000);
    if (interval > 1) {
        return interval + " months";
    }
    interval = Math.floor(seconds / 86400);
    if (interval > 1) {
        return interval + " days";
    }
    interval = Math.floor(seconds / 3600);
    if (interval > 1) {
        return interval + " hours";
    }
    interval = Math.floor(seconds / 60);
    if (interval > 1) {
        return interval + " minutes";
    }
    return Math.floor(seconds) + " seconds";
}

// HTML5 LocalStorage Handling
function AddKnownDevices(Device) 
{
   // store the searched element in the localstorage...
    if(typeof(Storage)!=="undefined")
	{
		// get it from LocalStorage or create the LocalStorage...
		
		if (localStorage.KnownDevices != null)
		{
			// Yes! localStorage and sessionStorage support!
			KnownDevices = JSON.parse(localStorage.KnownDevices);
			
			//console.log("KnownDevices Localstorage Content:");
			// check if the current Device is new or does already exist
			var deviceExists = false;
			for( var k=0; k<KnownDevices.length; k++ ) 
			{
				//console.log(KnownDevices[k]);
				if (KnownDevices[k].ID == Device.ID)
				{
					console.log("Device already in KnownDevices List");
					deviceExists = true;
					break;
				}
			}

			if (!deviceExists)
			{
				console.log("Device not in KnownDevices List, add");
				KnownDevices.push(Device);
				localStorage.KnownDevices = JSON.stringify(KnownDevices);
				makeUL('knowndeviceslist',KnownDevices);
			}

		}
		else
		{
			// create it new ... and store the first element
			var KnownDevices = [];
			KnownDevices.push(Device);
			
			localStorage.KnownDevices = JSON.stringify(KnownDevices);
			
			makeUL('knowndeviceslist',KnownDevices);
		}	

	}
	else
	{
		// Sorry! No web storage support..
		console.log("Error: Your browser does not support LocalStorage. Please update your browser.");
	}
}

function DeleteKnownDevices(DeviceID) 
{
   // store the searched element in the localstorage...
    if(typeof(Storage)!=="undefined")
	{
		// get it from LocalStorage or create the LocalStorage...
		if (localStorage.KnownDevices != null)
		{
			// Yes! localStorage and sessionStorage support!
			KnownDevices = JSON.parse(localStorage.KnownDevices);
			
			// we got the KnownDevices... now re-do it without the do-be-deleted element
			
			var newKnownDevices = [];
						
			for( var k=0; k<KnownDevices.length; k++ ) 
			{
				if (KnownDevices[k].ID != DeviceID)
					newKnownDevices.push(KnownDevices[k]);
			}

			localStorage.KnownDevices = JSON.stringify(newKnownDevices);
			makeUL('knowndeviceslist',newKnownDevices);
		}
		else
		{
			console.log("Error: Device should have been here, it is not... aborting.");
		}	

	}
	else
	{
		// Sorry! No web storage support..
		console.log("Error: Your browser does not support LocalStorage. Please update your browser.");
	}
}

function UpdateKnownDevices(DeviceID, DeviceName) 
{
   // store the searched element in the localstorage...
    if(typeof(Storage)!=="undefined")
	{
		// get it from LocalStorage or create the LocalStorage...
		if (localStorage.KnownDevices != null)
		{
			// Yes! localStorage and sessionStorage support!
			KnownDevices = JSON.parse(localStorage.KnownDevices);
			
			// we got the KnownDevices... now re-do it without the do-be-deleted element
			
			var newKnownDevices = [];
						
			for( var k=0; k<KnownDevices.length; k++ ) 
			{
				if (KnownDevices[k].ID != DeviceID)
				{
					newKnownDevices.push(KnownDevices[k]);
				}
				else
				{
					var _device = {};
					_device.Name = DeviceName;
					_device.ID = DeviceID;
					newKnownDevices.push(_device);	
				}					
			}

			localStorage.KnownDevices = JSON.stringify(newKnownDevices);
			makeUL('knowndeviceslist',newKnownDevices);
		}
		else
		{
			console.log("Error: Device should have been here, it is not... aborting.");
		}	

	}
	else
	{
		// Sorry! No web storage support..
		console.log("Error: Your browser does not support LocalStorage. Please update your browser.");
	}
}




var UUID = {
 // Return a randomly generated v4 UUID, per RFC 4122
 uuid4: function()
 {
  return this._uuid(
    this.randomInt(), this.randomInt(),
    this.randomInt(), this.randomInt(), 4);
 },

 // Create a versioned UUID from w1..w4, 32-bit non-negative ints
 _uuid: function(w1, w2, w3, w4, version)
 {
  var uuid = new Array(36);
  var data = [
   (w1 & 0xFFFFFFFF),
   (w2 & 0xFFFF0FFF) | ((version || 4) << 12), // version (1-5)
   (w3 & 0x3FFFFFFF) | 0x80000000,    // rfc 4122 variant
   (w4 & 0xFFFFFFFF)
  ];
  for (var i = 0, k = 0; i < 4; i++)
  {
   var rnd = data[i];
   for (var j = 0; j < 8; j++)
   {
    if (k == 8 || k == 13 || k == 18 || k == 23) {
     uuid[k++] = '-';
    }
    var r = (rnd >>> 28) & 0xf; // Take the high-order nybble
    rnd = (rnd & 0x0FFFFFFF) << 4;
    uuid[k++] = this.hex.charAt(r);
   }
  }
  return uuid.join('');
 },

 hex: '0123456789abcdef',

 // Return a random integer in [0, 2^32).
 randomInt: function()
 {
  return Math.floor(0x100000000 * Math.random());
 }
};


// MakeUL List Helper function
function makeUL(placeholderul, array) 
{
	// get the UL element to be filled...
	list = document.getElementById(placeholderul);
	
	// clear it first...
	list.innerHTML="";

    for(var i = 0; i < array.length; i++) {
        // Create the list item:
        var item = document.createElement('li');
	
		var devicespan = document.createElement("span");
		
		var devicehref = document.createElement("a");
			
			devicehref.href = "#"+array[i].ID;
			devicehref.onclick = function(deviceid) 
			{ 
				return function() 
				{ 
					// remove any existing timers...
					clearTimeout(markerUpdateTimer);
					
					GetLocation(deviceid);
				}; 
			}(array[i].ID);
			devicehref.innerHTML = array[i].Name;   
	
		var editButton = document.createElement("a");
			editButton.href = "#"+array[i].ID;
			editButton.setAttribute("data-toggle", "modal");
			editButton.setAttribute("data-target", "#editDevice");

			var editButtonImage = document.createElement("i");
			editButtonImage.setAttribute("class", "fa fa-pencil-square-o");
			editButtonImage.setAttribute("style", "padding: 5px");
			//editButtonImage.setAttribute("alt", "Edit this Device");
			editButtonImage.onclick = function(device) 
			{ 
				return function() 
				{ 
					// prefill fields...
					if (document.getElementById("editDevice_DeviceName") != null)
						document.getElementById("editDevice_DeviceName").value = device.Name;
					if (document.getElementById("editDevice_DeviceID") != null)
						document.getElementById("editDevice_DeviceID").innerHTML = device.ID;
					
					// call modal
					$('#editDevice').modal();
				}; 
			}(array[i]);
			devicehref.innerHTML = array[i].Name;

			var deleteButtonImage = document.createElement("i");
			deleteButtonImage.setAttribute("class", "fa fa-trash-o");
			deleteButtonImage.setAttribute("style", "padding: 5px");
			//deleteButtonImage.setAttribute("alt", "Delete this device");
			deleteButtonImage.onclick = function(device) 
			{ 
				return function() 
				{ 
					// prefill fields...
					if (document.getElementById("delete_deviceName") != null)
						document.getElementById("delete_deviceName").innerHTML = device.Name;
					if (document.getElementById("delete_deviceID") != null)
						document.getElementById("delete_deviceID").innerHTML = device.ID;

					// call modal
					$('#deleteDevice').modal();
				}; 
			}(array[i]);
			devicehref.innerHTML = array[i].Name;


			editButton.appendChild(devicehref);
			editButton.appendChild(editButtonImage);
			editButton.appendChild(devicespan);
		// now we got the devicehref and the editButton - we need to wrap them in bootstrap grid divs
		// now wrap in div

/*
		devicespan.appendChild(devicehref);

		item.appendChild(editButtonImage);
		item.appendChild(devicespan);

        // Add it to the list:
        list.appendChild(item);*/
        
        var inputgroup = document.createElement("div");
        inputgroup.setAttribute("class", "input-group");
        
        inputgroup.appendChild(devicehref);
        
        var spanbutton = document.createElement("span");
        spanbutton.setAttribute("class", "input-group-addon");
        
        spanbutton.appendChild(editButtonImage);
        spanbutton.appendChild(deleteButtonImage);
        
        inputgroup.appendChild(spanbutton);
        
        item.appendChild(inputgroup);
        list.appendChild(item);        
    }

    // Finally, return the constructed list:
    return list;
}

// Delete a device
function DeleteDevice()
{
	// get the UL element to be filled...
	deleteDeviceID = document.getElementById("delete_deviceID").innerHTML;

	console.log("Deleting Device: "+deleteDeviceID);
	DeleteKnownDevices(deleteDeviceID);	
}

// update a device
function UpdateDevice()
{
	// get the UL element to be filled...
	updateDeviceID = document.getElementById("editDevice_DeviceID").innerHTML;
	updateDeviceName = document.getElementById("editDevice_DeviceName").value;
	console.log("Updateing Device: "+updateDeviceID);
	
	UpdateKnownDevices(updateDeviceID,updateDeviceName);	
}
