import React, { useState, useCallback, useEffect } from "react";
import Navbar from "./Navbar";
import { FaCopy } from "react-icons/fa";
import { useContractCall } from "@/hooks/useContractRead";
import { ethers } from "ethers";
import { truncateAddress } from "../utils";
import Image from "next/image";
import RentCarModal from "./modals/RentCarModal";
import { useAccount, useBalance } from "wagmi";
import { getStatus } from "@/app/helper/getRentStatus";
import { useContractSend } from "@/hooks/useContractWrite";
import { toast } from "react-toastify";
import LoadingIcon from "./LoadingIcon";
import erc20 from "@/abis/erc20InstacnceAbi.json";

const CarDetails = ({ params }) => {
  const { data: getCars } = useContractCall("getCars", [params], true);
  const [carDetails, setCarDetails] = useState(null);
  const [isPaid, setIsPaid] = useState();
  const [displayBalance, setdisplayBalance] = useState(false);

  const { address, isConnected } = useAccount();
  const { data: cUSDBalance } = useBalance({
    address,
    token: erc20.address,
  });

  const { writeAsync: approve, isLoading: aprroveLoading } = useContractSend(
    "carApprove",
    [params]
  );
  const { writeAsync: reject, isLoading: rejectLoading } = useContractSend(
    "rejectCar",
    [params]
  );

  const getCarDetails = useCallback(() => {
    if (!getCars) return null;
    setCarDetails({
      owner: getCars[0],
      admin: getCars[1],
      model: getCars[2],
      image: getCars[3],
      plateNumber: getCars[4],
      bookingPrice: Number(getCars[5]),
      rentCar: Number(getCars[6]),
      carStatus: Number(getCars[7]),
    });
  }, [getCars]);

  const getRentSt = useCallback(async () => {
    const result = await getStatus({ params });
    console.log(result);
    const res = result;
    console.log(res)
    setIsPaid(res);
  }, [getStatus]);
  console.log(isPaid)

  useEffect(() => {
    // to display the cusd balance
    getCarDetails();
    getRentSt();
  }, [getCarDetails]);

  if (!carDetails) return null;

  const approveCar = async () => {
    if (!approve) throw new Error("Failed to approve car");
    try {
      await toast.promise(approve(), {
        pending: "Approving Car",
        success: "Successfully Approved",
        error: "Unexpected Error",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const rejectCar = async () => {
    if (!reject) throw new Error("Failed to approve car");
    try {
      await toast.promise(reject(), {
        pending: "Rejecting Car",
        success: "Successfully Rejected",
        error: "Unexpected Error",
      });
    } catch (error) {
      console.log(error);
    }
  };

  const convertCarHirePrice = ethers.utils.formatEther(
    carDetails?.bookingPrice.toString()
  );
  return (
    <>
      <div className=" flex  justify-between">
        {address == carDetails.admin ? (
          <div className=" flex flex-row gap-3">
            <div className="">
              {carDetails.carStatus == 0 ? (
                <button
                  className="border-2 border-[#06102b] p-2 text-white bg-[#1E002B] rounded-lg text-lg flex justify-center items-center"
                  onClick={approveCar}
                >
                  {aprroveLoading && <LoadingIcon />}
                  Approve
                </button>
              ) : (
                <button className=" cursor-not-allowed border-2 border-[#06102b] p-2 text-white bg-[#1E002B] rounded-lg text-lg flex justify-center items-center">
                  Approved
                </button>
              )}
            </div>
            <div>
              {carDetails.carStatus == 1 ? (
                <button
                  className="flex items-center justify-center border-2 border-[#06102b] p-2 text-white bg-[#1E002B]  rounded-lg text-lg "
                  onClick={rejectCar}
                >
                  {rejectLoading && <LoadingIcon />}
                  Reject
                </button>
              ) : (
                <button className=" cursor-not-allowed flex items-center justify-center border-2 border-[#1E002B] p-2 text-white bg-[#1E002B] rounded-lg text-lg ">
                  Rejected
                </button>
              )}
            </div>
          </div>
        ) : (
          <div>
            <p></p>
          </div>
        )}
        {carDetails.carStatus == 1 ? (
          isPaid == false ? (
            "Not Available for hire"
          ) : (
            <RentCarModal id={params} />
          )
        ) : (
          <p>Not available</p>
        )}
      </div>
      {/* <RentCarModal id={params} /> */}
      <div className="pt-4 container  px-8 flex lg:flex-row justify-center items-center  lg:gap-[16rem] md:gap-[5rem] sm:gap-[5rem] max-sm:gap-[3rem] md:flex-col max-sm:flex-col">
        <div className=" lg:w-96 md:w-96 sm:w-72 rounded-lg bg-black">
          <Image
            src={carDetails.image}
            className=" w-[100%] h-[100%]"
            decoding="async"
            alt="CarImage"
            width={200}
            height={200}
          />
        </div>
        <div className=" text-base font-semibold rounded-br-xl flex justify-center items-center text-center">
          <div className=" flex justify-between items-center flex-col">
            <div className=" flex flex-row gap-8  text-center justify-center items-center space-x-9">
              <span>
                <p className=" rounded-md border-1 border cursor-pointer bg-white p-2">
                  Booking Account
                </p>
                <p className="pt-2">{truncateAddress(carDetails.owner)}</p>
              </span>
              <span>
                <p className="rounded-md border-1 border cursor-pointer bg-white p-2">
                  Name
                </p>
                <p className="pt-2">{carDetails.model}</p>
              </span>
            </div>
            <div className=" text-center mt-4 flex flex-row gap-8 space-x-9">
              <div>
                <p className="rounded-md border-1 border cursor-pointer bg-white p-2">
                  Plate Number
                </p>
                <p className="pt-2">{carDetails.plateNumber}</p>
              </div>
              <div>
                <p className="rounded-md border-1 border cursor-pointer bg-white p-2">
                  Hire Rate
                </p>
                <span className=" cursor-pointer flex flex-row justify-center items-center pt-2">
                  <p>${convertCarHirePrice}</p>
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default CarDetails;
