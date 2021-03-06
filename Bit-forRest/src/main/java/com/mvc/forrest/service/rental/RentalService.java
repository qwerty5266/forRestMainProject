package com.mvc.forrest.service.rental;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import com.mvc.forrest.dao.rental.RentalDAO;
import com.mvc.forrest.service.domain.Rental;
import com.mvc.forrest.service.domain.Search;


@Service
public class RentalService {
	
	@Autowired
	private RentalDAO rentalDAO;
	
	// 물품대여추가
	public void addRental(Rental rental) throws Exception{
		System.out.println("addRental 실행 됨");
		rentalDAO.addRental(rental);
	}
	
	// 결제상세조회
		public Rental getRental(String tranNo) throws Exception{
			System.out.println("getRental 실행 됨");
			return rentalDAO.getRental(tranNo);
		}
	
	// 물품대여 리스트
		public Map<String, Object> getRentalList(Map<String,Object> map) throws Exception{
			
			List<Rental> list = rentalDAO.getRentalList(map);
			int totalCount = rentalDAO.getTotalCountUser(map);
			map.put("list", list);
			map.put("totalCount", totalCount);
			
			return map;
		}
		
		// 결제내역 보기 - 결제번호로 group by
		public List<Rental> getPaymentList(Search search, String userId) throws Exception{
			
			Map<String, Object> map= new HashMap<>();
			map.put("userId", userId);
			map.put("search", search);
			
			return rentalDAO.getPaymentList(map);
		}
		
		//결제번호로 결제품목 받아오기
		public List<Rental> getPayment(String paymentNo) throws Exception{
			
			
			return rentalDAO.getPayment(paymentNo);
		}
	
	//물품대여 리스트 ( Admin 용 )
	public Map<String, Object> getRentalListForAdmin(Search search) throws Exception{
		
		List<Rental> list = rentalDAO.getRentalListForAdmin(search);
		int totalCount = rentalDAO.getTotalCountAdmin(search);
		
		Map<String, Object> map = new HashMap<>();
		map.put("list", list);
		map.put("totalCount", totalCount);
		
		return map;
	}
	
	// 대여 수익 총계 출력 
	public int getTotalRentalProfit(String userId) throws Exception{
		
		int totalCount = rentalDAO.getTotalRentalProfit(userId);
		
		return totalCount ;
	}
	
	//대여수익리스트
		public Map<String, Object> getRentalListProfit(Search search, String userId) throws Exception{
			
			Map<String, Object> map = new HashMap<String, Object>();
			map.put("search", search);
			map.put("userId", userId);
			
			List<Rental> list = rentalDAO.getRentalListProfit(map);
			
			int totalCount = rentalDAO.getTotalCountRentalListProfit(map);
			System.out.println("2");
			System.out.println(totalCount);
			map.put("list", list);
			map.put("totalCount", totalCount);
			
			return map;
		}
		
		public int getRentalProfitTotal(String userId) throws Exception{
			
			
			int totalPrice = rentalDAO.getRentalProfitTotal(userId);
			if(totalPrice==0) {
				
			}
			return totalPrice;
			
		}
		
		
		//업데이트 리뷰 done
		
		public void updateReviewDone(Rental rental) throws Exception{

			rentalDAO.updateReviewDone(rental);

		}
		
		public void updateCancelDone(Rental rental) throws Exception{

			rentalDAO.updateCancelDone(rental);

		}
		
		public void updateComplete(Rental rental) throws Exception{

			rentalDAO.updateComplete(rental);

		}
		

}
