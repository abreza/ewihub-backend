function ExecuteScript(strId)
{
  switch (strId)
  {
      case "5ovZtGUUhkk":
        Script1();
        break;
      case "6C0snkGt1Na":
        Script2();
        break;
  }
}

function Script1()
{
  var player = GetPlayer();

player.SetVar('tmis_apiURL', 'https://tmis.peyto.net/api/lms');
player.SetVar('tmis_apiKey', '---');
player.SetVar('tmis_debug',1); // 1 or 0
player.SetVar('tmis_courseSlug', 'self-assessment');
player.SetVar('tmis_department', 'Default');

var data = {
	'id': player.GetVar('newID'),
              'email': player.GetVar('newID'),
	'name': player.GetVar('newName'),	
	'department': player.GetVar('tmis_department'),
	'course': player.GetVar('tmis_courseSlug'),
	'status': 'started',
	'apiKey': player.GetVar('tmis_apiKey'),
	'data': null
};

if( player.GetVar('tmis_debug') == 1 ){
	console.table(data);
}

if (window.$ != null){
    $.post(player.GetVar('tmis_apiURL'), data, receiveData, "json");
    function receiveData(data){
        if( player.GetVar('tmis_debug') == 1 ){
            console.dir(data);
        }
    }
}
else{
    const dataString = JSON.stringify(data);
    const http = new XMLHttpRequest();
    http.open('POST', player.GetVar('tmis_apiURL'), true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
        if(http.readyState == 4 && http.status == 200) {
            if( player.GetVar('tmis_debug') == 1 ) console.dir(data);
        }
    }
    http.send(dataString);
}

// ToDo: handle fail-over for submitted data => alternative: email using mailchimp
}

function Script2()
{
  var player = GetPlayer();

var data = {
	'id': player.GetVar('newID'),
              'email': player.GetVar('newID'),
	'name': player.GetVar('newName'),
	'department': player.GetVar('tmis_department'),
	'course': player.GetVar('tmis_courseSlug'),
	'status': 'finished',
	'apiKey': player.GetVar('tmis_apiKey'),
	'data': {
		'completedOn': player.GetVar('SystemDate'),
		'age': player.GetVar('Age'),
		'height': player.GetVar('Height'),
		'dominantHand': player.GetVar('DomHand'),
		'bifocals': player.GetVar('Bifocals'),
		'discomfort': player.GetVar('DiscomfortSubmit'),
		'visualIssue': player.GetVar('VisualIssue'),
		'computerTime': player.GetVar('ComputerTime'),
		'dualMonitor': player.GetVar('DualMon'),
		'laptop': player.GetVar('Laptop'),
		'sitToStand': player.GetVar('report_sit_stand'),
		'postureAchieved': player.GetVar('PostureAchieved'),
		'actionNeeded': player.GetVar('action_need'),
		'equipmentNeeded': player.GetVar('equip_need'),
		'adjustmentResult': player.GetVar('AdjustmentResult'),
		'result': player.GetVar('QuizDetail'),
		'demographic': player.GetVar('DemographicTMIS'),
		'trigger': player.GetVar('html_trigger'),
                            'discomfortAreas': player.GetVar('discomfort_areas'),
                            'TMISresult': player.GetVar('QuizResult')
	}
};

if( player.GetVar('tmis_debug') == 1 ){
	console.table(data);
}

if (window.$ != null){
    $.post(player.GetVar('tmis_apiURL'), data, receiveData, "json");
    function receiveData(data){
        if( player.GetVar('tmis_debug') == 1 ){
            console.dir(data);
        }
    }
}
else{
    const dataString = JSON.stringify(data);
    const http = new XMLHttpRequest();
    http.open('POST', player.GetVar('tmis_apiURL'), true);
    http.setRequestHeader('Content-type', 'application/json');
    http.onreadystatechange = function() {
        if(http.readyState == 4 && http.status == 200) {
            if( player.GetVar('tmis_debug') == 1 ) console.dir(data);
        }
    }
    http.send(dataString);
}

// ToDo: handle fail-over for submitted data => alternative: email using mailchimp
}

