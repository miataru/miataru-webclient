known_markers = [];
marker_names = [];

function htmlEncode(value){  
     //create a in-memory div, set it's inner text(which jQuery automatically encodes)   //then grab the encoded contents back out.  The div never exists on the page.   
    return $('<div/>').text(value).html(); 
}  
function htmlDecode(value){   
return $('<div/>').html(value).text(); 
}

// look if we got a hash parameter passed
if (window.location.hash != "")
{
    var Data = window.location.hash.slice( 1 ).split(";");
    var arrayLength = Data.length;

    if ( arrayLength % 2 === 0 )
    {
        for (var i = 0; i < arrayLength; i+=2) {
            console.log("User passed a device: " + htmlEncode( decodeURIComponent( Data[i] ) ));
            console.log("User named a device:" + htmlEncode( decodeURIComponent( Data[i+1] ) ) );
            
            var Device = {};
            Device.Name = htmlEncode( decodeURIComponent( Data[i+1] ) );
            Device.ID = htmlEncode( decodeURIComponent( Data[i] ) ) ;
    
            known_markers.push(L.realtime({
                url: 'https://service.miataru.com/v1/GetLocationGeoJSON/'+htmlEncode( decodeURIComponent( Data[i] ) ),
                crossOrigin: true,
                type: 'json'
            }, {
                interval: 3 * 1000
            }));
            marker_names.push(Device.Name);
        }
    }
}


var map = L.map('map');

var arrayLength = known_markers.length;

for (var i = 0; i < arrayLength; i++) 
{
    known_markers[i].addTo(map);
    known_markers[i].on('update', function() 
    {
        var group = new L.featureGroup(known_markers);
        map.fitBounds(group.getBounds());        
    });
}


L.tileLayer('http://{s}.maps.miataru.com/osm/{z}/{x}/{y}.png', {
	//L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
	//L.tileLayer('http://{s}.tile.cloudmade.com/1007c879cfc0485486e05b94ee5dc15c/997/256/{z}/{x}/{y}.png', {
		maxZoom: 18,
		attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>'
		}).addTo(map);

