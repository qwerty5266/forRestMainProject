const express = require('express');
const {QueryTypes} = require('sequelize');
const Query = require('../queries/query'); 
const db = require('../models/index');
const moment = require('moment');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

moment.locale('ko'); //한글로 시간 표시  

const router = express.Router();

//multer 설정
try{
	fs.readdirSync('uploads')
}catch(err){
	console.error('uploads 폴더가 없어서 생성합니다.');
	fs.mkdirSync('uploads');
}

const upload = multer({
	storage: multer.diskStorage({
		destination(req, file, done){
			done(null, 'uploads/');
		},
		filename(req,file,done){
			const ext = path.extname(file.originalname);
			done(null, path.basename(file.originalname, ext)+ext);
		},
	}),
	limits:{fileSize: 30*1024*1024},
});

//주소 파싱 도구함수 ㅎㅎ!
function parseAddress(address){
	const addr=address.split('/')[1];
	const parsedAddrArr = addr.split(' ');
	
	for(parsedAddr of parsedAddrArr){
		let parse =parsedAddr.substr(-1);
		if(parse=='동'){
			
			return parsedAddr;
			
		}else if(parse=='면'){
			
			return parsedAddr;
			
		}else if(parse=='읍'){
			
			return parsedAddr;
			
		}else if(parse=='리'){
			
			return parsedAddr;
			
		}else if(parse=='길'){
			
			return parsedAddr;
			
		}else if(parse=='로'){
			
			return parsedAddr;
		}
	}
} 


router.post('/addMap', async (req, res, next) => {
  try {
	const place = req.body.data;
	const chatRoomNo = req.body.chatRoomNo;
	//const sendUserId = req.body.sendUserId;
	
	req.app.get('io').of('/oldChat').to(chatRoomNo).emit('map',{place, chatRoomNo});
	
	console.log(place);
	console.log(chatRoomNo);
	//console.log(sendUserId);

	}catch (err) {
    console.error(err)
    next(err)
 	}
});

//지도 보내기 화면 redirect
router.get('/addMap', async (req, res, next) => {
  try {
	res.render('searchMap',{chatRoomNo: req.query.chatRoomNo, sendUserId:req.query.userId, oldNo:req.query.oldNo});
	}catch (err) {
    console.error(err)
    next(err)
 	}
});


//지도 보내기 중간 다리 역할
router.post('/bridge', async (req, res, next) => {
  try {
	const place = req.body.data;
	const chatRoomNo = req.body.chatRoomNo;
	const oldNo = req.body.oldNo;
	const sendUserId = req.body.sendUserId;
	console.log(place, chatRoomNo, oldNo, sendUserId)
	console.log('oldChat.js 내에서 bridge');
	
	req.app.get('io').of('/oldChat').to(chatRoomNo).emit('map',{place, chatRoomNo, oldNo, sendUserId});
	
	}catch (err) {
    console.error(err)
    next(err)
 	}
});



//중고거래 채팅방 나가기
router.get('/exit', async (req, res, next) => {
  try {
	let query=Query.updateChatRoomExit;
	const updateChatRoomExit = await db.sequelize.query(query,{
		replacements: {
			chatRoomNo: req.query.chatRoomNo,
			userId : req.session.user,
		},
		type: QueryTypes.UPDATE,
	  	raw: true
	});
	const io = req.app.get('io');
	io.of('/oldChatRoom').to(req.session.user).emit('exitRoom', req.query.chatRoomNo);

	}catch (err) {
    console.error(err)
    next(err)
 	}
});


//중고물품 상세조회에서 중고거래 채팅하기 버튼 눌렀을 시
router.get('/init/:userId/:oldNo', async (req, res, next) => {
  try {
	const sessionId = req.params.userId;
	const oldNo = req.params.oldNo;
 	//overwrite
	req.session.user = sessionId;
	req.session.save();
	
	//getOld
	let query=Query.getOld;
	const oldArr = await db.sequelize.query(query,{
		replacements: {
			oldNo: oldNo,
		},
		type: QueryTypes.SELECT,
      	raw: true
	});
	//물건주인 추적
	const ownerUserId = oldArr[0].userId;
	
	//원래 있던 방인가? 아니면 처음인가?
	query=Query.isNewOldChat;
	const isNewOldChat = await db.sequelize.query(query,{
		replacements: {
			oldNo: oldNo,
			inquireUserId: sessionId,
		},
		type: QueryTypes.SELECT,
      	raw: true
	});
	//console.log(isNewOldChat);

	let chatRoomNo;
	
	//처음이면 채팅방 생성. 아직 둘다 exit가 0,0상태임.
	if(isNewOldChat[0]===undefined){
		query=Query.insertOldChatRoom;
		var makeRoom = await db.sequelize.query(query,{
			replacements: {
				oldNo: oldNo,
				inquireUserId: sessionId,
				ownerUserId: ownerUserId,
			},
			type: QueryTypes.INSERT,
	      	raw: true
		});
		chatRoomNo=makeRoom[0]
		console.log('새로 생성됨. chatRoomNo : '+chatRoomNo);
	}else{
		chatRoomNo=isNewOldChat[0].chatRoomNo
		console.log('원래 있었음. chatRoomNo : '+chatRoomNo);
	}

	query=Query.listOldChatRoom;
    const lists = await db.sequelize.query(query, {
      replacements: {userId : sessionId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    for(let list of lists){
		list.recentTime = moment(list.recentTime).fromNow();
		list.inquireAddr = parseAddress(list.inquireAddr);
	}
	
	query=Query.getUser;
    const getUser = await db.sequelize.query(query, {
      replacements: {userId : sessionId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    const user= getUser[0];
    
    //response에 담아서 'oldChatRoom.html'로 보내기
    //console.log(lists);
    //console.log('chatRoomNo: '+chatRoomNo);
    const immediate = {chatRoomNo: chatRoomNo, oldNo: oldNo, userId: sessionId};
    res.render('oldChatRoom',{lists, immediate, user});

  }catch (err) {
    console.error(err)
    next(err)
  }
});



//기본화면. 중고거래 채팅방 목록을 보여준다.
router.get('/list/:userId', async (req, res, next) => {
  try {
	
	//nodejs session
	const sessionId = req.params.userId
	
	//overwrite
	req.session.user = sessionId;
	req.session.save()
	
	let query=Query.listOldChatRoom;
    const lists = await db.sequelize.query(query, {
      replacements: {userId : sessionId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    //~~분전 ~~시간 전
    for(let list of lists){
		list.recentTime = moment(list.recentTime).fromNow();
		console.log(parseAddress(list.inquireAddr));
		list.inquireAddr = parseAddress(list.inquireAddr);
	}
	
	query=Query.getUser
	const users = await db.sequelize.query(query, {
      replacements: {userId : sessionId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    const user = users[0];

	//response에 담아서 'oldChatRoom.html'로 보내기
    console.log(lists);
    console.log(user);
    res.render('oldChatRoom',{lists, user});

  }catch (err) {
    console.error(err)
    next(err)
  }
});




//해당 채팅방 더블클릭시 채팅창 이동
// '/oldChat/:oldNo?chatRoomNo=something'
router.get('/:oldNo', async (req, res, next) => {
  try {
	console.log('req.session.user : '+ req.session.user)
	console.log('req.query.chatRoomNo : '+req.query.chatRoomNo);
	//접속하면 읽음표시 ㄱㄱ
    let query=Query.updateReadOrNot;
    const updateReadOrNot = await db.sequelize.query(query, {
      replacements: {
		chatRoomNo : req.query.chatRoomNo,
		userId : req.session.user}, 
      type: QueryTypes.UPDATE,
      raw: true
    });
	
    //listChat
    query=Query.listChat;
    const chatLists = await db.sequelize.query(query, {
      replacements: {chatRoomNo : req.query.chatRoomNo}, //sessionId 끌어오는 법 알아내서 수정하자
      type: QueryTypes.SELECT,
      raw: true
    });

    //getOld
    query=Query.getOld;
    const oldArr = await db.sequelize.query(query, {
      replacements: {oldNo : req.params.oldNo}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    
    query=Query.getOtherUser;
    const getOtherUser = await db.sequelize.query(query, {
      replacements: 
      {	userId: req.session.user,
			chatRoomNo: req.query.chatRoomNo,    	
      	}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    query=Query.getUser;
    const getUser = await db.sequelize.query(query, {
      replacements: 
      {	userId: req.session.user,    	
      	}, 
      type: QueryTypes.SELECT,
      raw: true
    });

    const old = oldArr[0];
    const chatRoomNo = req.query.chatRoomNo;
    const user = getUser[0];
    const otherUser = getOtherUser[0];
    
    res.render('oldChat',{chatLists, old, user, chatRoomNo, otherUser});
    
    const io = req.app.get('io');
    io.of('/oldChat').to(chatRoomNo).emit('updateReadOrNot', req.session.user);

  }catch (err) {
    console.error(err)
    next(err)
  }
});


//채팅창 채팅치기
// '/oldChat/:oldNo/chat?chatRoomNo=something'
router.post('/chat/:oldNo', async (req, res, next) => {
  try {
    
    let query=Query.insertChat;
    const roomNo = req.query.chatRoomNo;
	const chatMessage = req.body.chat
    const isConnected = req.body.isConnected;
    
    let sessionUser=req.session.user;
    let insertChat;
    
    if(isConnected=='true'){
	    insertChat = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo,
	        sendUserId : sessionUser, //sessionId 
	        chatMessage : chatMessage,
	        readOrNot: null,
	        }, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
    }else{
		insertChat = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo,
	        sendUserId : sessionUser, //sessionId 
	        chatMessage : chatMessage,
	        readOrNot: 1
	        }, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
	}
    
    // sequelize insert는 primekey, foreignkey만 return해준다.
    
    //칠때마다 채팅방 나가기를 취소하고 채팅방이 보이게 한다.
    query=Query.updateChatRoomToSee
    const updateChatRoomToSee = await db.sequelize.query(query, {
      replacements: 
      { chatRoomNo : roomNo}, 
      type: QueryTypes.UPDATE,
      raw: true
    });

	const io = req.app.get('io');
	
    //보낸 채팅 얻어서 실시간으로 채팅창에 띄우기
    query=Query.getChat
    const getChat = await db.sequelize.query(query, {
      replacements: 
      { chatMessageNo : insertChat[0]}, 
      type: QueryTypes.SELECT,
      raw: true
    });
	
     //실시간으로 채팅방 나가기 취소하고, 해당 채팅방을 맨 위로.
    query=Query.listOldChatRoom;
    const mineLists = await db.sequelize.query(query, {
      replacements: {userId : sessionUser}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    //보낸 사람 채팅방에 실시간 업데이트
    mineLists[0].recentTime = moment(mineLists[0].recentTime).fromNow();
    mineLists[0].inquireAddr = parseAddress(mineLists[0].inquireAddr);
    io.of('/oldChatRoom').to(sessionUser).emit('updateRoom', mineLists[0]);
    
    //다른 상대방 유저 알아내서
    query=Query.getOtherUser;
    const getOtherUser = await db.sequelize.query(query, {
      replacements: {
		userId : sessionUser,
		chatRoomNo: roomNo}, 
      type: QueryTypes.SELECT,
      raw: true
    });
	
    query=Query.listOldChatRoom;
    const othersLists = await db.sequelize.query(query, {
      replacements: {userId : getOtherUser[0].userId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
	const data={chat: getChat, otherUser: getOtherUser[0]};
	console.log(data);
	
    io.of('/oldChat').to(roomNo).emit('oldChat',data);
    
    //다른 사람 채팅방에 실시간 업데이트
    othersLists[0].recentTime = moment(othersLists[0].recentTime).fromNow();
    othersLists[0].inquireAddr = parseAddress(othersLists[0].inquireAddr);
    io.of('/oldChatRoom').to(getOtherUser[0].userId).emit('updateRoom', othersLists[0]);

  }catch (err) {
    console.error(err)
    next(err)
  }
});

//지도 보내기
// '/oldChat/chat/:oldNo/map?chatRoomNo=something'
router.post('/chat/:oldNo/map', async (req, res, next) => {
  try {
    
    let query=Query.insertMap;
    const roomNo = req.query.chatRoomNo;
    const isConnected = req.body.isConnected;
    const place = req.body.map
    const chatMessage = '지도 : '+place.place_name;
    const map = JSON.stringify(place);
    
    let sessionUser=req.session.user;
    let insertMap;
    
    if(isConnected=='true'){
	    insertMap = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo,
	        sendUserId : sessionUser, //sessionId 
	        chatMessage : chatMessage,
	        map: map,
	        readOrNot: null,
	        }, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
    }else{
		insertMap = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo,
	        sendUserId : sessionUser, //sessionId 
	        chatMessage : chatMessage,
	        map: map, 
	        readOrNot: 1
	        }, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
	}
    //칠때마다 채팅방 나가기를 취소하고 채팅방이 보이게 한다.
    query=Query.updateChatRoomToSee
    const updateChatRoomToSee = await db.sequelize.query(query, {
      replacements: 
      { chatRoomNo : roomNo}, 
      type: QueryTypes.UPDATE,
      raw: true
    });

	const io = req.app.get('io');
	
    //보낸 채팅 얻어서 실시간으로 채팅창에 띄우기
    query=Query.getChat
    const getChat = await db.sequelize.query(query, {
      replacements: 
      { chatMessageNo : insertMap[0]}, 
      type: QueryTypes.SELECT,
      raw: true
    });
	
     //실시간으로 채팅방 나가기 취소하고, 해당 채팅방을 맨 위로.
    query=Query.listOldChatRoom;
    const mineLists = await db.sequelize.query(query, {
      replacements: {userId : sessionUser}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    //보낸 사람 채팅방에 실시간 업데이트
    mineLists[0].recentTime = moment(mineLists[0].recentTime).fromNow();
    mineLists[0].inquireAddr = parseAddress(mineLists[0].inquireAddr);
    io.of('/oldChatRoom').to(sessionUser).emit('updateRoom', mineLists[0]);
    
    //다른 상대방 유저 알아내서
    query=Query.getOtherUser;
    const getOtherUser = await db.sequelize.query(query, {
      replacements: {
		userId : sessionUser,
		chatRoomNo: roomNo}, 
      type: QueryTypes.SELECT,
      raw: true
    });
	
    query=Query.listOldChatRoom;
    const othersLists = await db.sequelize.query(query, {
      replacements: {userId : getOtherUser[0].userId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
	const data={chat: getChat, otherUser: getOtherUser[0]};
	console.log(data);
	
    io.of('/oldChat').to(roomNo).emit('oldChat',data);
    
    //다른 사람 채팅방에 실시간 업데이트
    othersLists[0].recentTime = moment(othersLists[0].recentTime).fromNow();
    othersLists[0].inquireAddr = parseAddress(othersLists[0].inquireAddr);
    io.of('/oldChatRoom').to(getOtherUser[0].userId).emit('updateRoom', othersLists[0]);
    

  }catch (err) {
    console.error(err)
    next(err)
  }
});

//사진 보내기
// '/oldChat/chat/:oldNo/image?chatRoomNo=something'
router.post('/chat/:oldNo/image', upload.array('imageArray'), async (req, res, next) => {
  try {
    const roomNo = req.query.chatRoomNo;
    const isConnected = req.body.isConnected;
    const chatMessage = '사진을 보냈습니다';
    const files = req.files;
    const sessionUser = req.session.user;
    
    console.log(isConnected);
    console.log(files);
  
    let insertImage;
    
    for(let file of files){
		
		let query =Query.insertImage;
	    if(isConnected=='true'){
		    insertImage = await db.sequelize.query(query, {
		      replacements: 
		      { chatRoomNo : roomNo,
		        sendUserId : sessionUser, //sessionId 
		        chatMessage : chatMessage,
		        fileName: file.filename,
		        readOrNot: null,
		        }, 
		      type: QueryTypes.INSERT,
		      raw: true
		    });
	    }else{
			insertImage = await db.sequelize.query(query, {
		      replacements: 
		      { chatRoomNo : roomNo,
		        sendUserId : sessionUser, //sessionId 
		        chatMessage : chatMessage,
		        fileName: file.filename, 
		        readOrNot: 1
		        }, 
		      type: QueryTypes.INSERT,
		      raw: true
		    });
		}
	    //칠때마다 채팅방 나가기를 취소하고 채팅방이 보이게 한다.
	    query=Query.updateChatRoomToSee
	    const updateChatRoomToSee = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo}, 
	      type: QueryTypes.UPDATE,
	      raw: true
	    });
	
		const io = req.app.get('io');
		
	    //보낸 채팅 얻어서 실시간으로 채팅창에 띄우기
	    query=Query.getChat
	    const getChat = await db.sequelize.query(query, {
	      replacements: 
	      { chatMessageNo : insertImage[0]}, 
	      type: QueryTypes.SELECT,
	      raw: true
	    });
		
	     //실시간으로 채팅방 나가기 취소하고, 해당 채팅방을 맨 위로.
	    query=Query.listOldChatRoom;
	    const mineLists = await db.sequelize.query(query, {
	      replacements: {userId : sessionUser}, 
	      type: QueryTypes.SELECT,
	      raw: true
	    });
	    
	    //보낸 사람 채팅방에 실시간 업데이트
	    mineLists[0].recentTime = moment(mineLists[0].recentTime).fromNow();
	    mineLists[0].inquireAddr = parseAddress(mineLists[0].inquireAddr);
	    io.of('/oldChatRoom').to(sessionUser).emit('updateRoom', mineLists[0]);
	    
	    //다른 상대방 유저 알아내서
	    query=Query.getOtherUser;
	    const getOtherUser = await db.sequelize.query(query, {
	      replacements: {
			userId : sessionUser,
			chatRoomNo: roomNo}, 
	      type: QueryTypes.SELECT,
	      raw: true
	    });
		
	    query=Query.listOldChatRoom;
	    const othersLists = await db.sequelize.query(query, {
	      replacements: {userId : getOtherUser[0].userId}, 
	      type: QueryTypes.SELECT,
	      raw: true
	    });
	    
		const data={chat: getChat, otherUser: getOtherUser[0]};
		//console.log(data);
		
	    io.of('/oldChat').to(roomNo).emit('oldChat',data);
	    
	    //다른 사람 채팅방에 실시간 업데이트
	    othersLists[0].recentTime = moment(othersLists[0].recentTime).fromNow();
	    othersLists[0].inquireAddr = parseAddress(othersLists[0].inquireAddr);
	    io.of('/oldChatRoom').to(getOtherUser[0].userId).emit('updateRoom', othersLists[0]);
	}
    

  }catch (err) {
    console.error(err)
    next(err)
  }
});

//리뷰사진보내기 
// '/oldChat/oldReview/:oldNo/:inquireUserId'
router.get('/oldReview/:oldNo/:inquireUserId', async (req, res, next) => {
  try {
	let query =Query.getChatRoomNo;
	const getChatRoomNo = await db.sequelize.query(query, {
	      replacements: 
	      { oldNo : req.params.oldNo,
	        inquireUserId : req.params.inquireUserId,
	        }, 
	      type: QueryTypes.SELECT,
	      raw: true
	    });
	
    const roomNo = getChatRoomNo[0].chatRoomNo;
    console.log('리뷰사진보내기 : chatRoomNo : '+roomNo);
    const chatMessage = 'system: 판매자가 리뷰를 보냈습니다! 판매자에게 구매를 남겨주시면 평점에 큰 도움이 됩니다! 사진 클릭 시 평점을 남길 수 있는 창으로 이동합니다';
    //다른 상대방 유저 알아내서
    query=Query.getOtherUser;
    const getOtherUser = await db.sequelize.query(query, {
      replacements: {
		userId : req.params.inquireUserId,
		chatRoomNo: roomNo}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    const sessionUser =getOtherUser[0].userId;
     console.log('리뷰사진보내기 : sessionUser : '+sessionUser);
    
	query =Query.insertImage;
	let insertImage = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo,
	        sendUserId : sessionUser, //sessionId 
	        chatMessage : chatMessage,
	        fileName: 'UnhappyMediocreCommongonolek-size_restricted.gif', 
	        readOrNot: 1,
	        }, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
	    
	query=Query.insertChat;   
	const insertChat = await db.sequelize.query(query, {
	      replacements: 
	      { chatRoomNo : roomNo,
	        sendUserId : sessionUser, //sessionId 
	        chatMessage : chatMessage,
	        readOrNot: 1
	        }, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
	 
	
    //칠때마다 채팅방 나가기를 취소하고 채팅방이 보이게 한다.
    query=Query.updateChatRoomToSee
    const updateChatRoomToSee = await db.sequelize.query(query, {
      replacements: 
      { chatRoomNo : roomNo}, 
      type: QueryTypes.UPDATE,
      raw: true
    });

	const io = req.app.get('io');
	
    //보낸 채팅 얻어서 실시간으로 채팅창에 띄우기
    query=Query.getChat
    const getChat = await db.sequelize.query(query, {
      replacements: 
      { chatMessageNo : insertChat[0]}, 
      type: QueryTypes.SELECT,
      raw: true
    });
   
    const getImage = await db.sequelize.query(query, {
      replacements: 
      { chatMessageNo : insertImage[0]}, 
      type: QueryTypes.SELECT,
      raw: true
    });
	
     //실시간으로 채팅방 나가기 취소하고, 해당 채팅방을 맨 위로.
    query=Query.listOldChatRoom;
    const mineLists = await db.sequelize.query(query, {
      replacements: {userId : sessionUser}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
    //보낸 사람 채팅방에 실시간 업데이트
    mineLists[0].recentTime = moment(mineLists[0].recentTime).fromNow();
    mineLists[0].inquireAddr = parseAddress(mineLists[0].inquireAddr);
    io.of('/oldChatRoom').to(sessionUser).emit('updateRoom', mineLists[0]);
	
    query=Query.listOldChatRoom;
    const othersLists = await db.sequelize.query(query, {
      replacements: {userId : getOtherUser[0].userId}, 
      type: QueryTypes.SELECT,
      raw: true
    });
    
	const data1={chat: getImage, otherUser: getOtherUser[0], review: true};
    io.of('/oldChat').to(roomNo).emit('oldChat',data1);
	const data2={chat: getChat, otherUser: getOtherUser[0]};
    io.of('/oldChat').to(roomNo).emit('oldChat',data2);
    
    //다른 사람 채팅방에 실시간 업데이트
    othersLists[0].recentTime = moment(othersLists[0].recentTime).fromNow();
    othersLists[0].inquireAddr = parseAddress(othersLists[0].inquireAddr);
    io.of('/oldChatRoom').to(getOtherUser[0].userId).emit('updateRoom', othersLists[0]);

  }catch (err) {
    console.error(err)
    next(err)
  }
});


//아무 채팅도 없는 방에서 접속 끊기면 해당 채팅방 삭제
router.get('/oldChat/delete/:chatRoomNo', async (req, res, next) => {
  try {
	console.log('삭제?');
	const chatRoomNo = req.params.chatRoomNo
	
	let query=Query.isChatRoomEmpty;
    const isChatRoomEmpty = await db.sequelize.query(query, {
      replacements: {chatRoomNo : chatRoomNo}, 
      type: QueryTypes.SELECT,
      raw: true
    });

	if(isChatRoomEmpty===0){
		console.log('아무것도 안 친 방에서 접속이 끊기므로 해당 방을 삭제합니다.');
		
		query=Query.deleteChatRoom;
	    const deleteChatRoom = await db.sequelize.query(query, {
	      replacements: {chatRoomNo : chatRoomNo}, 
	      type: QueryTypes.DELETE,
	      raw: true
	    });
    }

  }catch (err) {
    console.error(err)
    next(err)
  }
});

//addReview
router.post('/add/review', async (req, res, next) => {
  try {
	let query=Query.addOldReview;
	    const addOldReview = await db.sequelize.query(query, {
	      replacements: {
			reviewUserId : req.body.reviewUserId, 
			reviewedUserId : req.body.reviewedUserId, 
			oldNo : req.body.oldNo, 
			reviewDetail : req.body.reviewDetail, 
			userRate : req.body.userRate}, 
	      type: QueryTypes.INSERT,
	      raw: true
	    });
  }catch (err) {
    console.error(err)
    next(err)
  }
});

module.exports = router;
