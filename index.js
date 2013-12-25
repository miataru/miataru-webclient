var map;

function init() 
{
map = L.map('map').setView([50.00,10.000], 5);

		L.tileLayer('http://{s}.tile.cloudmade.com/BC9A493B41014CAABB98F0471D759707/997/256/{z}/{x}/{y}.png', {
			maxZoom: 18,
			attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://cloudmade.com">CloudMade</a>'
		}).addTo(map);

		
// add location control to global name space for testing only
// on a production site, omit the "lc = "!
L.control.locate({follow: false}).addTo(map);

//map.on('startfollowing', function() {
//    map.on('dragstart', lc.stopFollowing);
//}).on('stopfollowing', function() {
//    map.off('dragstart', lc.stopFollowing);
//});
		
}

function GetLocation(DeviceID)
{
	// build miataru GetLocationRequest
	var GetLocationRequest = {};
	var Device = {};
	Device.Device = DeviceID;
	GetLocationRequest.MiataruGetLocation = new Array(Device);

	var GLR = JSON.stringify(GetLocationRequest);
	
	console.log(GLR);

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
					//var map = L.map('map')				
					var deviceName = data.MiataruLocation[0].Device + " - "+ timeSince(data.MiataruLocation[0].Timestamp)+ " ago";
					L.marker([data.MiataruLocation[0].Latitude,data.MiataruLocation[0].Longitude]).addTo(map).bindPopup(deviceName);
					map.fitBounds([[data.MiataruLocation[0].Latitude,data.MiataruLocation[0].Longitude]]);
					
					var Device = {};
					Device.Name = DeviceID;
					Device.ID = DeviceID;
					AddKnownDevices(Device);
				}
				else
				{
					console.log("Device could not be found");
				}
			},
			error: function(){
				console.log("The miataru service could not be reached or returned an error.");
				},
			processData: false,
			type: 'POST',
			url: 'http://service.miataru.com/v1/GetLocation'
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
			
			console.log("KnownDevices Localstorage Content:");
			// check if the current Device is new or does already exist
			var deviceExists = false;
			for( var k=0; k<KnownDevices.length; k++ ) 
			{
				console.log(KnownDevices[k]);
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
	}
}


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
		
		var link = document.createElement("a");
			//link.id = array[i].ID;
			link.href = "#"+array[i].ID;
			link.onclick = function(deviceid) 
			{ 
				return function() 
				{ 
					GetLocation(deviceid);
				}; 
			}(array[i].ID);
			link.innerHTML = array[i].Name;   
	
        // Set its contents:
		item.appendChild(link);

/*		var link = document.createElement("a");
			//link.id = array[i].ID;
			link.href = "#"+array[i].ID;
			link.onclick = function(deviceid) 
			{ 
				return function() 
				{ 
					EditKnownDevice(deviceid);
				}; 
			}(array[i].ID);
			link.innerHTML = array[i].Name;   
	
        // Set its contents:
        //item.appendChild(document.createTextNode(array[i].Name));
		item.appendChild(link);
*/
		
        // Add it to the list:
        list.appendChild(item);
    }

    // Finally, return the constructed list:
    return list;
}