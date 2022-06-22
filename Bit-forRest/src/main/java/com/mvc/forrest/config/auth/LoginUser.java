package com.mvc.forrest.config.auth;

import java.net.HttpURLConnection;
import java.net.URL;
import java.sql.Timestamp;
import java.util.ArrayList;
import java.util.Calendar;
import java.util.Collection;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.core.authority.SimpleGrantedAuthority;
import org.springframework.security.core.userdetails.UserDetails;
import org.springframework.security.oauth2.core.user.OAuth2User;

import com.mvc.forrest.service.coupon.CouponService;
import com.mvc.forrest.service.domain.Coupon;
import com.mvc.forrest.service.domain.OwnCoupon;
import com.mvc.forrest.service.domain.User;
import com.mvc.forrest.service.user.UserService;

import lombok.Data;

@Data
public class LoginUser  implements UserDetails , OAuth2User{

	/**
	 로그인 했을 때 정보들
	 스프링 시큐리티가 로그인 요청을 가로채서 로그인을 진행하고 완료가 되면 UserDetails 타입의 오브젝트를
	 스프링 시큐리티의 고유한 세션 저장소에 저장을 해준다.
	 */
	private static final long serialVersionUID = 1L;
	
	private User user;
	private Map<String, Object> attributes;
	private Collection<? extends GrantedAuthority> authorities;
	
	@Autowired
	private CouponService couponService;
	@Autowired
	private UserService userService;
	
	public LoginUser(User user){
		System.out.println(user);
		this.user=user;
		///////////////////////////////////////////////////////////////
//		
//		try {
//	        	System.out.println(":: Connect to Chatting Service");
//			String reqURL = "http://192.168.0.42:3001/sessionLoginLogout/login/"+user.getUserId();
//			URL url = new URL(reqURL);
//			HttpURLConnection conn = (HttpURLConnection) url.openConnection();
//			conn.setRequestMethod("GET");
//			conn.setConnectTimeout(500);
//			int responseCode = conn.getResponseCode();
//			System.out.println(":: Chatting Service responseCode : " + responseCode);
//	        	System.out.println("Node server is Dead ..");
//		}catch(Exception e){
//			System.out.println("채팅연결 실패");
//		}
//		
//		try {
//	        if(user.getJoinDate().equals(user.getRecentDate())) {
//		        OwnCoupon oc = new OwnCoupon();
//				Coupon coupon = couponService.getCoupon("2");	//2번 쿠폰 = 신규회원 쿠폰
//				Calendar cal= Calendar.getInstance();
//				cal.add(Calendar.DATE,30);
//				Timestamp ts1 = new Timestamp(System.currentTimeMillis());
//				Timestamp ts2 = new Timestamp(cal.getTimeInMillis());
//				oc.setOwnUser(user);
//				oc.setOwnCoupon(coupon);
//				oc.setOwnCouponCreDate(ts1);
//				oc.setOwnCouponDelDate(ts2);
//				couponService.addOwnCoupon(oc);
//				
//				System.out.println("신규유저 쿠폰발급");
//	        }
//		}catch(Exception e) {
////			e.printStackTrace();
//			System.out.println("신규유저 쿠폰발급 실패");
//		}
//		
//        try {
//        	System.out.println(user);
//			System.out.println(user.getUserId());
//			userService.updateRecentDate(user);
//			
//		} catch (Exception e) {
////			e.printStackTrace();
//			System.out.println("접속날짜 갱신 실패");
//		}	
//        
		////////////////////////////////////////////////////////////////
	}
	
    public LoginUser(User user, Map<String, Object> attribute) {
    	System.out.println("LoginUser : "+user);
        this.user = user;
        this.attributes = attributes;
        
        
    }
	
	
	//getter setter 만들어 줘야 해
	
	public LoginUser() {
	}

	//권한이 한개 이상일 경우가 있기 때문에 Collection으로 리턴함
	@Override
	public Collection<? extends GrantedAuthority> getAuthorities() {
		Collection<GrantedAuthority> collector = new ArrayList<>();
		collector.add(new SimpleGrantedAuthority(user.getRole()));
		return collector;
	}

	@Override
	public String getPassword() {
		return user.getPassword();
	}

	@Override
	public String getUsername() {
		if(user.getUserId()==null) {
			return user.getUserName();
		}
		return user.getUserId();
	}
	

	@Override
	public boolean isAccountNonExpired() {
		// 계정 만료 판단 로직 만료면 false 리턴
		return true;
	}

	@Override
	public boolean isAccountNonLocked() {
		// 계정 잠김 로직 잠김상태면 false
		return user.isAccountNonLocked();
//		return true;
	}

	@Override
	public boolean isCredentialsNonExpired() {
		// 비밀번호가 만료 검사 만료 됐으면 false
		return true;
	}

	@Override
	public boolean isEnabled() {
		// 계정 활성화 검사 휴면 유저면 false
		return user.isDisabled();
	}

    /**
     * OAuth2User 구현
     * @return
     */
    @Override
    public Map<String, Object> getAttributes() {
        return attributes;
    }

    /**
     * OAuth2User 구현
     * @return
     */
    @Override
    public String getName() {
        String sub = attributes.get("sub").toString();
        return sub;
    }


	
		
}
