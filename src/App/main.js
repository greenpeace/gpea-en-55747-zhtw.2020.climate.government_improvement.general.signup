import './all.css'
import './main.scss'


/**
 * This script use the google sheet as the DB
 */

const {$, anime, autosize, Cookies, Highcharts, dataLayer} = window
const apiUrl = "https://cors-anywhere.arpuli.com/https://script.google.com/macros/s/AKfycbx_Wg8GKV7fp_hae910yvuUzjpUbrWHPvCyRTyibdQOzQtgOTo/exec"
// const apiUrl = "https://script.google.com/macros/s/AKfycbzRtGHGwTYjnzTUbYsSJSbWtYh7D47qGaSbLg-CeLq4v6xwWLI/exec" // test project

var options_id = 'en__field_supporter_questions_288643'; // 選擇關心議題的 id

var free_text_id = 'en__field_supporter_questions_288644';
var email_optin_id = 'en__field_supporter_questions_7276';
var nro_data_ok_id = '';

var base_url = 'https://change.greenpeace.org.tw/2020/petition/zh-tw.2020.climate.vote/options/';  //cdn url
var resultData = [
	// 'name', 'y', 'color'
	["減碳目標再翻新"	        ,25, '#FEA47F'],
	["加速淘汰燃煤電廠"	        ,25, '#25CCF7'],
	["規劃再生能源下一步"	      ,25, '#EAB543'],
	["用電大戶承擔更多綠能責任"	,15, '#55E6C1'],
	["停止投資高污染、高耗能產業"	,15, '#CAD3C8'],
	["不再使用塑膠與其他石化產品"	,25, '#58B19F'],
]

Object.assign($.validator.messages, {
	required: "此項為必填"
});

/**
 * Resolve the en page status by checking the pageJson
 *
 * @return {string} FRESH | SUCC | ERROR
 */
const resolveEnPagePetitionStatus = () => {
	let status = "FRESH";

	if (window.pageJson.pageNumber === 2) {
		status = "SUCC"; // succ page
	} else {
		status = "FRESH"; // start page
	}

	return status;
};

const gtmTrack = ({category, action, label, value}) => {
	dataLayer.push({
		'event': 'gaEvent',
		'eventCategory': category,
		'eventAction': action,
		'eventLabel': label,
		'eventValue': value
	});

	dataLayer.push({
		'event' : 'fbqEvent',
		'contentCategory': category,
		'contentType': action,
		'contentName': label,
		'value': value
	});
}

window.share = () => {
	// WEB SHARE API
	if (navigator.share) {
		// we can use web share!
		navigator
			.share({
				title: "2020 我希望臺灣優先採取的氣候行動是...",
				text: "節能減碳不是一個人的事！臺灣能如何扭轉氣候危機？立即分享你的想法，群策群力、守護地球！",
				url: "https://act.gp/32dQkaT"
			})
			.then(() => console.log("Successfully shared"))
			.catch(error => console.log("Error sharing:", error));
	} else {
		// provide a fallback here
		var baseURL = "https://www.facebook.com/sharer/sharer.php";
		var u = "https://act.gp/32dQkaT";
		console.log('open', baseURL + "?u=" + encodeURIComponent(u))
		window.open(
			baseURL + "?u=" + encodeURIComponent(u),
			"_blank"
		);
	}
}

$(function(){
	var scrollTo= function(t, s){
		$("html, body").stop().animate({scrollTop:t}, s, 'swing', function() { });
	},
	pageHandler = {
		goTo: function(to, from){
			this.hide(to,from);
		},
		hide: function(to, from){
			if(from == '#voting'){
				votingPage.hide().then(() => {pageHandler.show(to, from)})
			}
			else if(from == '#form'){
				formPage.hide().then(() => {pageHandler.show(to, from)})
			}
			else{
				pageHandler.show(to, from)
			}
		},
		show: function(to, from){
			$(to).addClass('in');
			$(from).removeClass('active');
			if(to == '#voting'){
				votingPage.show().then(() => {$(to).addClass('active').removeClass('in');})
			}
			else if(to == '#form'){
				formPage.show().then(() => {$(to).addClass('active').removeClass('in');})
			}
			else{
				$(to).addClass('active').removeClass('in');
			}
			scrollTo(0,0);
		}
	},
	votingPage = {
		count: 0,
		active: false,
		$container: null,
		istyping: false,
		init: function(){
			var _ = this;

			_.$container = $('#voting');
			_.$container.find('.option .vote-btn').click(function(e){
				e.preventDefault();
				e.stopPropagation();
				if($(this).hasClass('checked')){
					$(this).removeClass('checked');
					if(_.count<=3){
						_.$container.find('.options').removeClass('full');
					}
					_.count--;
				}
				else{
					if(_.count >=2){
						_.$container.find('.options').addClass('full');
					}
					if(_.count<3){
						$(this).addClass('checked');
						_.count++;
					}
				}
				if(_.count >0){
					_.$container.find('.next-btn').addClass('show').find('.count').text(_.count);
				}
				else{
					_.$container.find('.next-btn').removeClass('show').find('.count').text(_.count);
				}
			}).end().find('#details .vote').click(function(e){
				if(_.count >= 3 && !$(this).find('.vote-btn').hasClass('checked')) return;
				$(this).find('.vote-btn').toggleClass('checked');
				$('#'+$(this).data('option')+' .vote-btn').trigger('click');

			}).end().find('.readmore').click(function(e){
				e.preventDefault();
				_.showDetail($(this).parents('.option:first'));

			}).end().find('#overlay, #details .close-btn').click(function(e){
				e.preventDefault();
				_.$container.removeClass('detail');
			}).end().find('.option').click(function(e){
				e.preventDefault();
				_.showDetail($(this));
			});

			// handle click submit voting
			_.$container.find('.next-btn').click(function(e){
				e.preventDefault();

				// collect picked options
				let chosens = []
				_.$container.find('.vote-btn.checked').each(function(k,v) {
					var title = $(v).data('title')
					chosens.push(title)
				});

				// log this event
				gtmTrack({
					'category': 'Petitions',
					'action': 'Vote',
					'label': '2020 climate win',
					'value' : chosens.join(",")
				});

				// send the request to server2
				fetch(apiUrl+"?sheetName=votes", {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json'
					},
					body: JSON.stringify({
						rows: [
							{
								ip:ip,
								choosen_1: chosens.length>0 ? chosens[0] : "",
								choosen_2: chosens.length>1 ? chosens[1] : "",
								choosen_3: chosens.length>2 ? chosens[2] : "",
							}
						]
					})
				})

				// save the selection to localStorage
				localStorage.setItem('choosed_options', JSON.stringify(chosens));

				// go to next page
				pageHandler.goTo('#form', '#voting');

			}).end().find('.typing-btn').click(function(e){
				e.preventDefault();
				_.showTyping();
			});

			// auto-height the textarea
			autosize($('#typing-panel textarea').get(0));

			// bind submit event for the typing-panel
			$('#type-next-btn').click(function(e){
				e.preventDefault();
				var text = $.trim($('#typing-panel textarea').val());
				if(text !== ''){
					_.resetTyping();
					$('#'+free_text_id).val(text);

					// log event
					gtmTrack({
						'category': 'Petitions',
						'action': 'Custom Vote',
						'label': '2020 climate win',
						'value' : text
					});

					// send to server
					fetch(apiUrl+"?sheetName=notes", {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json'
						},
						body: JSON.stringify({
							rows: [{ip:ip, message: text}]
						})
					})

					pageHandler.goTo('#form', '#voting');
				}
				else{
					alert('please enter your #ReasonsForHope');
					$('#typing-panel textarea').focus();
				}
			});
			var keys = [192, 49, 50, 51, 52, 53, 54, 55, 56, 57, 48, 189, 187, 8, 9, 16, 17, 18, 91, 32, 93, 18, 37, 40, 39, 38, 188, 190, 191, 186, 222, 16, 13, 219, 221, 220];
			$('body').keyup(function(e) {
				if(!votingPage.active) return;
				if(e.keyCode == 27 && _.istyping){
					_.resetTyping();
				}
				else if(!_.istyping && keys.indexOf(e.keyCode) == -1){
					_.showTyping();
				}
			});
			$('#typing-panel .close-btn').bind('click', function(e){
				e.preventDefault();
				_.resetTyping();
			});
			$('#typing-panel textarea').bind('input', function(){
				var val =  $(this).val();
				val = val.replace(/^\s+/g, "");//$.trim($(this).val());
				if(_.istyping && val.length >200){
					$('#typing-panel textarea').val(val.substring(0,200));
				}
				else{
					$('#typing-panel textarea').val(val);
				}
			});
		},
		resetTyping: function(){
			$('body').removeClass('typing');
			this.istyping = false;
		},
		showTyping: function(){
			$('body').addClass('typing');
			$('#typing-panel textarea').focus();
			this.istyping = true;
		},
		showDetail: function($option){
			var $detail = $('#details'), _ = this;
			$detail.find('.img').css('backgroundImage', 'url('+$option.data('img')+')').find('h2').text($option.find('.title').text()).end().end().find('.content').html($option.find('.desc').html()).end().find('.vote').data('option', $option.attr('id')).find('.vote-btn').toggleClass('checked', $option.find('.vote-btn').hasClass('checked'));
			_.$container.addClass('detail');
			setTimeout(function(){
				$('#detail').animate({scrollTop:0}, 0);
			}, 500);
		},
		show: function(){
			return new Promise((resolve, reject) => {
			var votingTimeline = anime.timeline({
				easing: 'easeOutQuart',
				complete: function(anim) {
					votingPage.active = true;
					$('body').removeClass('intro');
						resolve();
					}
			});

			votingTimeline
				.add({
					targets: '#voting',
					opacity: 1,
					duration: 200
				}).add({
					targets: '#voting .sp-title .word',
					translateY: [30, 0],
					rotate: ['.02turn', '-0turn'],
					opacity:[0,1],
					duration: 700,
					delay: function(el, i, l) {
						return (i * 25);
					},
					offset: 0,
				})
				.add({
					targets: '#voting .left-col .out',
					translateY: [60, 0],
					opacity:[0,1],
					duration: 700,
					delay: function(el, i, l) {
						return 300+(i * 25);
					},
					offset: '-=850' // Starts 600ms before the previous animation ends
				})
				.add({
					targets: '#voting .options .out',
					translateY: [90, 0],
					opacity:[0,1],
					delay: function(el, i, l) {
						return (i * 115);
					},
					offset: '-=550' // Starts 800ms before the previous animation ends
				}).add({
					targets: '#voting .option .title',
					translateY: [30, 0],
					opacity: [0, 1],
					duration: 700,
					delay: function(el, i, l) {
						return (i * 115);
					},
						offset: 750 // Starts 800ms before the previous animation ends
				});

			});
		},
		hide: function(){
			return new Promise((resolve, reject) => {
				votingPage.active = false;
				 anime({
					targets: '#voting',
					opacity: [1, 0],
					easing: 'easeInOutExpo',
					duration: 400,
					complete: function(){
						resolve();
					}
				});
			});
		}
	},
	formPage = {
		$container: null,
		map_init: false,
		init: function(){
			var _ = this;
			_.$container = $('#form');


			_.$container.find('input, select').bind('change blur', function(){
				if($(this).attr('id') == 'fake_optin') {
					if(document.getElementById('fake_optin').checked){
						$('#local_optin_wrapper').show();
					} else {
						$('#local_optin_wrapper').hide();
					}
				}
				if($(this).val() !== ''){
					$(this).addClass('filled');
				}
				else{
					$(this).removeClass('filled');
				}
			});

			_.$container
			.find('button').click(function(e){
				e.preventDefault();
				$("#fake-form").submit();
			}).end()
			.find('.back-btn').click(function(e){
				e.preventDefault();
				pageHandler.goTo('#voting', '#form');
			});

			// create the year options
			let currYear = new Date().getFullYear()
			for (var i = 0; i < 80; i++) {
				let option = `<option value="${currYear-i}">${currYear-i}</option>`

				$("#fake_supporter_birthYear").append(option);
				$('#en__field_supporter_NOT_TAGGED_6').append(option);
			}

			$.validator.addMethod( //override email with django email validator regex - fringe cases: "user@admin.state.in..us" or "name@website.a"
						'email',
						function(value, element){
								return this.optional(element) || /^[a-zA-Z0-9.!#$%&'*+\/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/i.test(value);
						},
						'Email 格式錯誤'
				);

			$("#fake-form").validate({
				errorPlacement: function(error, element) {
					element.parents("div.form-field:first").after( error );
				},
				submitHandler: function(form) {
					// do other things for a valid form
					var temp = [];

					$('#voting .option .vote-btn.checked').each(function(k,v) {
						var id = $(v).data('id');
						temp.push(id);
					});

					// Cookies.set('checked_options', temp);
					console.log('en__field_supporter_questions_288643', temp.join())
					$('#'+options_id).val(temp.join());
					$('#en__field_supporter_firstName').val($('#fake_supporter_firstName').val());
					$('#en__field_supporter_lastName').val($('#fake_supporter_lastName').val());
					$('#en__field_supporter_emailAddress').val($('#fake_supporter_emailAddress').val());

					$('#en__field_supporter_phoneNumber').val($('#fake_supporter_phoneNumber').val());
					$('#en__field_supporter_NOT_TAGGED_6').val($('#fake_supporter_birthYear').val());

					if(document.getElementById('fake_optin').checked) {
						$('#'+email_optin_id).prop( "checked", true );
					} else {
						$('#'+email_optin_id).prop( "checked", false );
					}
					if($('#fake_local_optin').length>0 && document.getElementById('fake_local_optin').checked) {
						$('#'+nro_data_ok_id).prop( "checked", true ).prop("disabled", false);
					} else {
						$('#'+nro_data_ok_id).prop( "checked", false );
					}
					$("form.en__component--page").submit();
				},
				invalidHandler: function(event, validator) {
					// 'this' refers to the form
					var errors = validator.numberOfInvalids();
					if (errors) {
						var message = errors == 1
							? 'You missed 1 field. It has been highlighted'
							: 'You missed ' + errors + ' fields. They have been highlighted';
						// alert(message);
						$("div.error").show();
					} else {
						$("div.error").hide();
					}
				}
			});
		},
		init_iframe: function(){
			if(this.map_init) return;
			var $el = $('#map iframe');
			$el.attr('src', $el.data('src'));
			this.map_init = true;
		},
		show: function(){
			return new Promise((resolve, reject) => {
				var formTL = anime.timeline({
					easing: 'easeOutQuart',
					complete: function(anim) {
						formPage.init_iframe();
						resolve();
					}
				});

				formTL
					.add({
						targets: '#form',
						opacity: [0, 1],
						duration: 200
					})
					.add({
						targets: '#form .sp-title .word',
						translateY: [30, 0],
						rotate: ['.02turn', '-0turn'],
						opacity:[0,1],
						duration: 700,
						delay: function(el, i, l) {
							return (i * 25);
						},
						offset: 0,
					})
					.add({
						targets: '#form .left-col .out',
						translateY: [60, 0],
						opacity:[0,1],
						duration: 700,
						delay: function(el, i, l) {
							return 300+(i * 25);
						},
						offset: '-=850' // Starts 600ms before the previous animation ends
					});
			});
		},
		hide: function(){
			return new Promise((resolve, reject) => {
				anime({
					targets: '#form',
					opacity: [1, 0],
					easing: 'easeInOutExpo',
					duration: 400,
					complete: function(){
						resolve();
					}
				});
			});
		}
	},
	resultPage = {
		init: function(){
			var _ = this;

			$('body').removeClass('intro');

			_.fetchChartData()
				.then(() => {_.renderChart()})
				.then(() => {this.show()})
		},
		fetchChartData: () => {
			var _ = this;

			if (_.chartDateFetched) {
				return new Promise((resolve) => {
					resolve()
				})
			}

			return fetch(apiUrl+"?sheetName=votes_summary")
				.then(response => response.json())
				.then(response => {
					if (response.status==="OK") {
						_.chartDateFetched = true;

						let rows = response.values,
							header = rows.shift() // should be ["key", "summary"]

						let chartData = []
						rows.forEach(row => {
							let foundIdx = resultData.findIndex(chartRow => chartRow[0]===row[0])
							if (foundIdx>-1) {
								resultData[foundIdx][1] = row[1]
							}
						})
					} else {
						console.error("Cannot fetch the pulling results")
					}
				})
		},
		renderChart: () => {
			// read choosed options
			let chosens = JSON.parse(localStorage.getItem('choosed_options') || "[]");
			console.log('Use Chart Data', resultData)

			Highcharts.chart('chart', {
				chart: {
					plotShadow: false,
					type: 'bar',
					height: '400px',
				},
				title: {text: ''},
				xAxis: {
					visible: true,
					labels: {
						enabled: false
					}
				},
				yAxis: {
					visible: false,
					labels: {
						enabled: false
					}
				},
				tooltip: { enabled: false },
				plotOptions: {},
				legend: {
					enabled: false
				},
				series: [{
					colorByPoint: true,
					keys: ['name', 'y', 'color'],
					dataLabels: {
						enabled: true,
						color: '#FFFFFF',
						style: {fontSize: '1rem'},
						useHTML: true,
						formatter:function() {
							var pcnt = (this.y / this.series.data.map(p => p.y).reduce((a, b) => a + b, 0)) * 100;
							let checked = chosens.indexOf(this.point.name)>-1
							return `${checked ? '<i class="fas fa-check-circle"></i> ' : ''}${this.point.name} ${pcnt.toFixed(1)+"%"}` ;
						},
						inside: true,
						align: 'left'
					},
					data: resultData,
					pointWidth: 50
				}]
			});
		},
		show: function(){
			return new Promise((resolve, reject) => {
			var formTL = anime.timeline({
				easing: 'easeOutQuart',
				complete: function(anim) {
						resolve();
					}
			});

			formTL
				.add({
					targets: '#result .sp-title .word',
					translateY: [30, 0],
					rotate: ['.02turn', '-0turn'],
					opacity:1,
					duration: 700,
					delay: function(el, i, l) {
						return (i * 25);
					},
				})
				.add({
					targets: '#result .left-col .out',
					translateY: [60, 0],
					opacity:[0,1],
					duration: 700,
					delay: function(el, i, l) {
						return 300+(i * 25);
					},
					offset: '-=850' // Starts 600ms before the previous animation ends
				});
			});
		}
	},
	introPage = {
		introTL: null,
		active: true,
		init: function(){
			var _ = this;
			_.resize();
			$('body').on('touchmove', function(e){
				return (_.active)? false: true;
			});
			$('#skip').click(function(e){
				e.preventDefault();
				// _.introTL.seek(_.introTL.duration);
				pageHandler.goTo('#voting', '#intro');
			});
			_.show();
		},
		resize: function(){
			$('body').css('height', $(window).height());
		},
		show: function(){
			var _ = this;

			return new Promise((resolve) => {
				pageHandler.goTo('#voting', '#intro');
				_.active = false;
				resolve()
			})
		}
	};

	// fetch user's ip
	let ip = "";
	fetch("https://api.ipify.org?format=json")
		.then((response) => response.json())
		.then((response) => {
			if (response.ip) {
				ip = response.ip
			}
		})

	// resolve which the current page is
	const EN_PAGE_STATUS = resolveEnPagePetitionStatus()
	console.log("EN_PAGE_STATUS", EN_PAGE_STATUS)
	if (EN_PAGE_STATUS==="FRESH") {
		if($('#voting').length == 1){
			votingPage.init();
			formPage.init();
		}

		scrollTo(0,0);
		setTimeout(function(){
			scrollTo(0,0);
			if($('#intro').length == 1) introPage.init();
		}, 400);

		$(window).resize(function(){
			if(introPage.active) introPage.resize();
		});
	} else if (EN_PAGE_STATUS==="SUCC") {
		pageHandler.goTo('#result', '#intro');
		resultPage.init();
	}
});
