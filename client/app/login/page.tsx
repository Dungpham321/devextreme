"use client";
import React, { useCallback, useRef } from 'react'
import Style from './login.module.css';
import { ValidationRule } from 'devextreme-react/common';
import Form, {
    ButtonItem,
    GroupItem,
    SimpleItem,
    Label,
    CompareRule,
    EmailRule,
    PatternRule,
    RangeRule,
    RequiredRule,
    StringLengthRule,
    AsyncRule,
    CustomRule,
    type FormTypes,
    Item,
    FormRef,
} from 'devextreme-react/form';
import { Button } from 'devextreme-react/button';
import 'devextreme-react/text-area';
import 'devextreme-react/autocomplete';
import 'devextreme-react/date-range-box';
import 'devextreme/dist/css/dx.light.css';
const passwordOptions = {
    mode: 'password',
    placeholder: 'Nhập mật khẩu', // Optional: add a placeholder
};
const taikhoanOptions = {
    placeholder: 'Nhập tài khoản'
}
const formData = {
    ten_dang_nhap: null,
    mat_khau: null
}

const login = () => {
    const formRef = useRef<FormRef>(null);
    const submitButtonOptions = {
        type: "success",
        text: "Đăng nhập",
        onClick: function () {
            const validationResult = formRef.current?.instance().validate();
            if (validationResult?.isValid){
                alert("hhhh");
            }
        }
    };
    return (
        <div className={Style.login} id='form_container'>
            <div className='bg-white bg-opacity-90 backdrop-blur-md rounded-lg shadow-lg p-8 w-[400px]'>
                <h2 className="text-3xl font-bold text-center text-gray-900 mb-6">Đăng nhập</h2>
                <Form formData={formData} ref={formRef} labelLocation={'top'} >
                    <SimpleItem dataField="ten_dang_nhap" editorType="dxTextBox" editorOptions={taikhoanOptions}>
                        <Label text='Tên đăng nhập' />
                        <RequiredRule message="Tên đăng nhập là thông tin cần nhập" />
                    </SimpleItem>
                    <SimpleItem dataField="mat_khau" editorType="dxTextBox" editorOptions={passwordOptions}>
                        <Label text='Mật khẩu' />
                        <RequiredRule message="Mật khẩu là thông tin cần nhập" />
                    </SimpleItem>
                     <Item itemType="button" buttonOptions={submitButtonOptions} horizontalAlignment={'center'}/>
                </Form>
            </div>
        </div>

    )
}

export default login