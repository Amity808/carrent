// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/AccessControl.sol";

interface IERC20Token {
    function transfer(address, uint256) external returns (bool);
    function approve(address, uint256) external returns (bool);
    function transferFrom(address, address, uint256) external returns (bool);
    function totalSupply() external view  returns (uint256);
    function balanceOf(address) external view  returns (uint256);
    function allowance(address, address) external view  returns (uint256);

    event Transfer(address indexed from, address indexed to, uint256 value);
    event Approval(address indexed owner, address indexed spender, uint256 value);
}

contract CarBooking is AccessControl {

    // celo cUsd address
    address internal cUsdTokenAddress;

    uint256 public carLength;
    uint256 public rentLength;

    event CarAdded(address indexed owner, string model, string plateNumber);
    event RentCompleted(uint256 carID, address renter, uint256 amount);


    enum CarStatus {
        NOTACCEPT,
        ACCEPTED,
        OUT_OF_SERVICE
    }

     enum OrderStatus {
        OPEN,
        INPROGRESS,
        CANCELLED,
        COMPLETED
    }
    
    struct Rent {
        uint256 carID;
        address carAddress;
        address BookingAcount;
        string name;
        string destination;
        uint256 amount;
        bool paid;
    }
    
    struct Car {
        address payable owner;
        string model;
        string image;
        string plateNumber;
        uint256 bookingPrice;
        CarStatus carStatus;
        OrderStatus orderStatus;
        Rent[] carRent; // Store the indices of rents for this car
    }

    constructor(address _cUsdTokenAddress) {
        cUsdTokenAddress = _cUsdTokenAddress;
        _grantRole(DEFAULT_ADMIN_ROLE, msg.sender);
        admin = msg.sender;
    }

    fallback() external payable {}

    modifier onlyAdmin() {
        require(hasRole(DEFAULT_ADMIN_ROLE, msg.sender), "Only admin can call this function");
        _;
    }
    
    mapping (uint256 => Car) public cars;

    
    function addCar(string memory _model, string memory _imageCar,string memory _plateNumber, uint256 _bookingPrice) public {
         // Use carLength as the carID
        
        Car storage newCar = cars[carLength];
        newCar.owner = payable (msg.sender);
        newCar.admin = admin;
        newCar.model = _model;
        newCar.image = _imageCar;
        newCar.plateNumber = _plateNumber;
        newCar.bookingPrice = _bookingPrice;
        // newCar.carStatus = CarStatus.ACCEPTED;
        carLength++;
        emit CarAdded(msg.sender, _model, _plateNumber);
    }

    function carApprove (uint256 _carId) public onlyAdmin {
        Car storage car = cars[_carId];
        require(car.carStatus == CarStatus.NOTACCEPT, "car did not meetup to our service or already accepted");
        car.carStatus = CarStatus.ACCEPTED;
    }

    function rejectCar (uint256 _carId) public onlyAdmin {
        Car storage car = cars[_carId];
        require(car.carStatus == CarStatus.ACCEPTED, "car not Accept");
        car.carStatus = CarStatus.NOTACCEPT;
    }

    function outOfServiceCar (uint256 _carId) public onlyAdmin {
        Car storage car = cars[_carId];
        require(car.carStatus == CarStatus.ACCEPTED, "Car is not approve");
        car.carStatus = CarStatus.OUT_OF_SERVICE;
    }
    
    function addRent(uint256 _carID, string memory _name, string memory _destination) public {
        require(_carID < carLength, "Invalide Car index");
        Car storage car = cars[_carID];
        require(car.carStatus == CarStatus.ACCEPTED , "Car is not approve for useage");
        require(car.orderStatus == OrderStatus.OPEN , "Car is alreadly on hire");
        Rent memory newRent = Rent({
            carID: _carID,
            carAddress: car.owner,
            BookingAcount: msg.sender,
            name: _name,
            destination: _destination,
            amount: car.bookingPrice,
            paid: false
        });
        rentLength++;
        
        cars[_carID].orderStatus = OrderStatus.INPROGRESS; 
        cars[_carID].carRent.push(newRent);
    }

    function getCars(uint256 _index) public view returns (
        address, address, string memory, string memory,
        string memory, uint256,
        uint256,
        CarStatus, 
        OrderStatus
    ) {
        Car storage car = cars[_index];
        return (
            car.owner,
            car.admin,
            car.model,
            car.image,
            car.plateNumber,
            car.bookingPrice,
            car.rentCar,
            car.carStatus,
            car.orderStatus
        );
    }
    function getRent(uint256 _index) public view returns (
        uint256,
        address,
        address,
        string memory,
        string memory,
        uint256,
        bool
    ) {
        Car storage car = cars[_index];
        return (
            car.carRent[_index].carID,
            car.carRent[_index].carAddress,
            car.carRent[_index].BookingAcount,
            car.carRent[_index].name,
            car.carRent[_index].destination,
            car.carRent[_index].amount,
            car.carRent[_index].paid
        );
    }

    function getCarLength() public view returns(uint256) {
        return carLength;
    }

    function getRentLength() public view returns(uint256) {
        return rentLength;
    }

    

    function carRentPayment(uint256 _index) external payable  {
        Car storage car = cars[_index];
        require(msg.sender == car.carRent[_index].BookingAcount, "Must be the owner");
        require(IERC20Token(cUsdTokenAddress).transferFrom(
            msg.sender,
            cars[_index].owner,
            car.bookingPrice
         ), "Transfer failed");
        car.carRent[_index].paid = true;
        cars[_index].orderStatus = OrderStatus.OPEN; 
        emit RentCompleted(_index, msg.sender, car.bookingPrice);
    }
}
